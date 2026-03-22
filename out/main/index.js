"use strict";
const electron = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");
const https = require("https");
const crypto = require("crypto");
const child_process = require("child_process");
const proxyChain = require("proxy-chain");
const os = require("os");
const is = {
  dev: !electron.app.isPackaged
};
const platform = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
};
const electronApp = {
  setAppUserModelId(id) {
    if (platform.isWindows)
      electron.app.setAppUserModelId(is.dev ? process.execPath : id);
  },
  setAutoLaunch(auto) {
    if (platform.isLinux)
      return false;
    const isOpenAtLogin = () => {
      return electron.app.getLoginItemSettings().openAtLogin;
    };
    if (isOpenAtLogin() !== auto) {
      electron.app.setLoginItemSettings({
        openAtLogin: auto,
        path: process.execPath
      });
      return isOpenAtLogin() === auto;
    } else {
      return true;
    }
  },
  skipProxy() {
    return electron.session.defaultSession.setProxy({ mode: "direct" });
  }
};
const optimizer = {
  watchWindowShortcuts(window, shortcutOptions) {
    if (!window)
      return;
    const { webContents } = window;
    const { escToCloseWindow = false, zoom = false } = shortcutOptions || {};
    webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown") {
        if (!is.dev) {
          if (input.code === "KeyR" && (input.control || input.meta))
            event.preventDefault();
        } else {
          if (input.code === "F12") {
            if (webContents.isDevToolsOpened()) {
              webContents.closeDevTools();
            } else {
              webContents.openDevTools({ mode: "undocked" });
              console.log("Open dev tool...");
            }
          }
        }
        if (escToCloseWindow) {
          if (input.code === "Escape" && input.key !== "Process") {
            window.close();
            event.preventDefault();
          }
        }
        if (!zoom) {
          if (input.code === "Minus" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "Equal" && input.shift && (input.control || input.meta))
            event.preventDefault();
        }
      }
    });
  },
  registerFramelessWindowIpc() {
    electron.ipcMain.on("win:invoke", (event, action) => {
      const win = electron.BrowserWindow.fromWebContents(event.sender);
      if (win) {
        if (action === "show") {
          win.show();
        } else if (action === "showInactive") {
          win.showInactive();
        } else if (action === "min") {
          win.minimize();
        } else if (action === "max") {
          const isMaximized = win.isMaximized();
          if (isMaximized) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        } else if (action === "close") {
          win.close();
        }
      }
    });
  }
};
let db;
function getDb() {
  if (db) return db;
  const dbPath = path.join(electron.app.getPath("userData"), "database.sqlite");
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}
function initDatabase() {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_history (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      installed_on DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const migrationsDir = electron.app.isPackaged ? path.join(process.resourcesPath, "migrations") : path.join(__dirname, "../../src/main/database/migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.warn("Migrations directory not found:", migrationsDir);
    return;
  }
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort((a, b) => {
    const vA = parseInt(a.split("__")[0].substring(1));
    const vB = parseInt(b.split("__")[0].substring(1));
    return vA - vB;
  });
  const runMigration = database.transaction((version, name, sql) => {
    database.exec(sql);
    database.prepare("INSERT INTO schema_history (version, name) VALUES (?, ?)").run(version, name);
  });
  const markMigrationApplied = (version, name) => {
    database.prepare("INSERT INTO schema_history (version, name) VALUES (?, ?)").run(version, name);
  };
  const isDuplicateColumnError = (error) => {
    return error instanceof Error && /duplicate column name/i.test(error.message);
  };
  for (const file of files) {
    const versionMatch = file.match(/^V(\d+)__(.+)\.sql$/);
    if (!versionMatch) continue;
    const version = parseInt(versionMatch[1]);
    const name = versionMatch[2];
    const row = database.prepare("SELECT 1 FROM schema_history WHERE version = ?").get(version);
    if (!row) {
      console.log(`Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      try {
        runMigration(version, name, sql);
      } catch (err) {
        if (isDuplicateColumnError(err)) {
          console.warn(`Migration ${file} skipped because column already exists. Marking as applied.`);
          markMigrationApplied(version, name);
          continue;
        }
        console.error(`Failed to apply migration ${file}:`, err);
        throw err;
      }
    }
  }
  console.log("Database initialized and migrated successfully");
}
const EXECUTABLE_BY_PLATFORM = {
  win32: ["chrome.exe", "ungoogled-chromium.exe", "chromium.exe"],
  darwin: [
    "Chromium.app/Contents/MacOS/Chromium",
    "Google Chrome.app/Contents/MacOS/Google Chrome",
    "Brave Browser.app/Contents/MacOS/Brave Browser",
    "chrome",
    "chromium"
  ],
  linux: ["chrome", "chromium", "ungoogled-chromium"]
};
const FINGERPRINT_CHROMIUM_RELEASE = "144.0.7559.132";
const DEFAULT_RELEASE_DOWNLOAD_URL = {
  win32: `https://github.com/adryfish/fingerprint-chromium/releases/download/${FINGERPRINT_CHROMIUM_RELEASE}/ungoogled-chromium_144.0.7559.132-1.1_windows_x64.zip`,
  linux: `https://github.com/adryfish/fingerprint-chromium/releases/download/${FINGERPRINT_CHROMIUM_RELEASE}/ungoogled-chromium-144.0.7559.132-1-x86_64_linux.tar.xz`
};
function getExecutableCandidates() {
  const platform2 = process.platform;
  return EXECUTABLE_BY_PLATFORM[platform2] ?? ["chrome", "chromium"];
}
function toRootPath(...parts) {
  return electron.app.isPackaged ? path.join(process.resourcesPath, ...parts) : path.join(process.cwd(), ...parts);
}
function isExecutable(filePath) {
  if (!fs.existsSync(filePath)) return false;
  if (process.platform === "win32") return true;
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
function findExistingChromiumBinary() {
  const envPaths = [process.env.UNGOOGLED_CHROMIUM_PATH, process.env.CHROMIUM_PATH].filter(Boolean);
  for (const candidate of envPaths) {
    if (isExecutable(candidate)) {
      return { path: candidate, source: "env" };
    }
  }
  const platformAbsoluteCandidates = {
    darwin: [
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
    ]
  };
  for (const candidate of platformAbsoluteCandidates[process.platform] ?? []) {
    if (isExecutable(candidate)) {
      return { path: candidate, source: "local" };
    }
  }
  const roots = [
    toRootPath("browser"),
    path.join(electron.app.getPath("userData"), "browser")
  ];
  const executables = getExecutableCandidates();
  for (const root of roots) {
    for (const executable of executables) {
      const candidate = path.join(root, executable);
      if (isExecutable(candidate)) {
        return { path: candidate, source: "local" };
      }
    }
  }
  return null;
}
function createDownloadDir() {
  const dir = path.join(electron.app.getPath("userData"), "browser");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
function downloadFile$1(url, outputPath) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const statusCode = response.statusCode ?? 0;
      if ([301, 302, 307, 308].includes(statusCode)) {
        const redirect = response.headers.location;
        response.resume();
        if (!redirect) {
          reject(new Error("Chromium download redirected without a location header."));
          return;
        }
        downloadFile$1(redirect, outputPath).then(resolve).catch(reject);
        return;
      }
      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(new Error(`Chromium download failed with HTTP status ${statusCode}.`));
        return;
      }
      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close();
        resolve();
      });
      fileStream.on("error", (error) => {
        fileStream.close();
        reject(error);
      });
    });
    request.on("error", reject);
  });
}
function calculateSha256(filePath) {
  const hash = crypto.createHash("sha256");
  const fileBuffer = fs.readFileSync(filePath);
  hash.update(fileBuffer);
  return hash.digest("hex");
}
function ensureExecutableBit(filePath) {
  if (process.platform !== "win32") {
    fs.chmodSync(filePath, 493);
  }
}
function findBinaryRecursively(rootDir) {
  const executables = getExecutableCandidates();
  const walk = (dirPath) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const nested = walk(fullPath);
        if (nested) return nested;
      }
      if (entry.isFile()) {
        if (executables.includes(entry.name) && isExecutable(fullPath)) {
          return fullPath;
        }
      }
    }
    return null;
  };
  return walk(rootDir);
}
function extractArchive(archivePath, outputDir) {
  if (archivePath.endsWith(".zip")) {
    if (process.platform === "win32") {
      const cmd = `Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${outputDir.replace(/'/g, "''")}' -Force`;
      const result = child_process.spawnSync("powershell", ["-NoProfile", "-Command", cmd], { stdio: "pipe" });
      if (result.status !== 0) {
        throw new Error(`Failed to extract Chromium zip: ${result.stderr.toString()}`);
      }
      return;
    }
    const unzipResult = child_process.spawnSync("unzip", ["-o", archivePath, "-d", outputDir], { stdio: "pipe" });
    if (unzipResult.status !== 0) {
      throw new Error(`Failed to extract Chromium zip: ${unzipResult.stderr.toString()}`);
    }
    return;
  }
  if (archivePath.endsWith(".tar.xz")) {
    const tarResult = child_process.spawnSync("tar", ["-xJf", archivePath, "-C", outputDir], { stdio: "pipe" });
    if (tarResult.status !== 0) {
      throw new Error(`Failed to extract Chromium tar.xz: ${tarResult.stderr.toString()}`);
    }
    return;
  }
  throw new Error("Unsupported Chromium archive format. Use a direct binary URL, .zip, or .tar.xz archive URL.");
}
function defaultDownloadUrlForPlatform() {
  const fromEnv = (() => {
    switch (process.platform) {
      case "win32":
        return process.env.UNGOOGLED_CHROMIUM_URL_WIN;
      case "darwin":
        return process.env.UNGOOGLED_CHROMIUM_URL_MAC;
      case "linux":
        return process.env.UNGOOGLED_CHROMIUM_URL_LINUX;
      default:
        return void 0;
    }
  })();
  if (fromEnv) return fromEnv;
  switch (process.platform) {
    case "win32":
    case "linux":
      return DEFAULT_RELEASE_DOWNLOAD_URL[process.platform];
    default:
      return void 0;
  }
}
async function downloadChromium(downloadUrl, expectedSha256) {
  const downloadDir = createDownloadDir();
  const urlObject = new URL(downloadUrl);
  const fileName = path.basename(urlObject.pathname) || "chromium-download";
  const downloadedPath = path.join(downloadDir, fileName);
  await downloadFile$1(downloadUrl, downloadedPath);
  if (expectedSha256) {
    const actual = calculateSha256(downloadedPath);
    if (actual.toLowerCase() !== expectedSha256.toLowerCase()) {
      throw new Error("SHA256 verification failed for downloaded Chromium binary.");
    }
  }
  if (downloadedPath.endsWith(".zip") || downloadedPath.endsWith(".tar.xz")) {
    const extractDir = path.join(downloadDir, "extracted");
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }
    extractArchive(downloadedPath, extractDir);
    const extractedBinary = findBinaryRecursively(extractDir);
    if (!extractedBinary) {
      throw new Error("Unable to locate Chromium executable in extracted archive.");
    }
    ensureExecutableBit(extractedBinary);
    return extractedBinary;
  }
  ensureExecutableBit(downloadedPath);
  return downloadedPath;
}
async function ensureChromiumBinary(options = {}) {
  if (!options.forceDownload) {
    const existing = findExistingChromiumBinary();
    if (existing) return existing;
  }
  const downloadUrl = options.downloadUrl ?? process.env.UNGOOGLED_CHROMIUM_URL ?? defaultDownloadUrlForPlatform();
  if (!downloadUrl) {
    throw new Error(
      [
        "Chromium binary not found.",
        "Set UNGOOGLED_CHROMIUM_PATH/CHROMIUM_PATH or place binary in ./browser.",
        "On macOS, install Chromium/Google Chrome locally or define UNGOOGLED_CHROMIUM_URL_MAC.",
        "On Windows/Linux, auto-download defaults to adryfish/fingerprint-chromium 144.0.7559.132.",
        "You can override with UNGOOGLED_CHROMIUM_URL (or platform-specific URL env vars)."
      ].join(" ")
    );
  }
  const binaryPath = await downloadChromium(downloadUrl, options.expectedSha256);
  return { path: binaryPath, source: "downloaded" };
}
const IPC_CHANNELS = {
  PROFILES_GET_ALL: "profiles:getAll",
  PROFILES_CREATE: "profiles:create",
  PROFILES_UPDATE: "profiles:update",
  PROFILES_DELETE: "profiles:delete",
  PROFILES_START: "profiles:start",
  PROFILES_STOP: "profiles:stop",
  PROFILES_BULK_UPDATE: "profiles:bulkUpdate",
  PROFILES_BULK_OPEN: "profiles:bulkOpen",
  PROFILES_BULK_CLOSE: "profiles:bulkClose",
  PROFILES_BULK_PROXY_ASSIGN: "profiles:bulkProxyAssign",
  PROFILES_BULK_PROXY_ASSIGN_MAP: "profiles:bulkProxyAssignMap",
  PROFILES_IMPORT_ZIP: "profiles:importZip",
  PROFILES_EXPORT_ZIP: "profiles:exportZip",
  PROFILES_OPEN_FOLDER: "profiles:openFolder",
  COOKIES_READ: "cookies:read",
  COOKIES_WRITE: "cookies:write",
  COOKIES_CLEAR: "cookies:clear",
  BOOKMARKS_LIST: "bookmarks:list",
  BOOKMARKS_ADD: "bookmarks:add",
  BOOKMARKS_DELETE: "bookmarks:delete",
  BOOKMARKS_IMPORT_JSON: "bookmarks:importJson",
  EXTENSIONS_LIST: "extensions:list",
  EXTENSIONS_INSTALL_UNPACKED: "extensions:installUnpacked",
  EXTENSIONS_INSTALL_CRX: "extensions:installCrx",
  EXTENSIONS_INSTALL_WEBSTORE: "extensions:installWebstore",
  EXTENSIONS_REMOVE: "extensions:remove",
  EXTENSIONS_TOGGLE: "extensions:toggle",
  PROXIES_GET_ALL: "proxies:getAll",
  PROXIES_CREATE: "proxies:create",
  PROXIES_UPDATE: "proxies:update",
  PROXIES_DELETE: "proxies:delete",
  GROUPS_GET_ALL: "groups:getAll",
  GROUPS_CREATE: "groups:create",
  GROUPS_UPDATE: "groups:update",
  GROUPS_DELETE: "groups:delete",
  STATUS_PROFILE_CHANGED: "status:profileChanged"
};
function parseTags(raw) {
  if (!raw) return void 0;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return void 0;
    return parsed.filter((value) => typeof value === "string");
  } catch {
    return void 0;
  }
}
class ProfileRepository {
  hasFingerprintSeedColumn;
  hasTagsColumn;
  constructor() {
    this.hasFingerprintSeedColumn = this.ensureFingerprintSeedColumn();
    this.hasTagsColumn = this.ensureTagsColumn();
  }
  ensureFingerprintSeedColumn() {
    const columns = getDb().prepare("PRAGMA table_info(profiles)").all();
    const hasFingerprintSeed = columns.some((column) => column.name === "fingerprint_seed");
    if (hasFingerprintSeed) return true;
    getDb().exec("ALTER TABLE profiles ADD COLUMN fingerprint_seed INTEGER");
    getDb().exec("UPDATE profiles SET fingerprint_seed = (abs(random()) % 900000) + 100000 WHERE fingerprint_seed IS NULL");
    return true;
  }
  ensureTagsColumn() {
    const columns = getDb().prepare("PRAGMA table_info(profiles)").all();
    const hasTags = columns.some((column) => column.name === "tags");
    if (hasTags) return true;
    getDb().exec("ALTER TABLE profiles ADD COLUMN tags TEXT");
    return true;
  }
  toProfile(row) {
    return {
      id: row.id,
      name: row.name,
      groupId: row.group_id ?? void 0,
      note: row.note ?? void 0,
      proxyId: row.proxy_id ?? void 0,
      fingerprintSeed: row.fingerprint_seed ?? crypto.randomInt(1e5, 999999),
      userAgent: row.user_agent ?? void 0,
      timezone: row.timezone ?? void 0,
      tags: parseTags(row.tags),
      isPinned: Boolean(row.is_pinned),
      lastOpened: row.last_opened ?? void 0,
      createdAt: row.created_at,
      status: "idle"
    };
  }
  list() {
    const rows = getDb().prepare(
      `
          SELECT id, name, group_id, note, proxy_id, ${this.hasFingerprintSeedColumn ? "fingerprint_seed," : ""} user_agent, timezone,
                 ${this.hasTagsColumn ? "tags," : ""} is_pinned, last_opened, created_at
          FROM profiles
          ORDER BY is_pinned DESC, datetime(created_at) DESC
        `
    ).all();
    return rows.map((row) => this.toProfile(row));
  }
  getById(id) {
    const row = getDb().prepare(
      `
          SELECT id, name, group_id, note, proxy_id, ${this.hasFingerprintSeedColumn ? "fingerprint_seed," : ""} user_agent, timezone,
                 ${this.hasTagsColumn ? "tags," : ""} is_pinned, last_opened, created_at
          FROM profiles
          WHERE id = ?
        `
    ).get(id);
    return row ? this.toProfile(row) : null;
  }
  create(data) {
    if (!data.name || !data.name.trim()) {
      throw new Error("Profile name is required.");
    }
    const id = data.id ?? crypto.randomUUID();
    const fingerprintSeed = data.fingerprintSeed ?? crypto.randomInt(1e5, 999999);
    if (this.hasTagsColumn) {
      getDb().prepare(
        `
            INSERT INTO profiles (id, name, fingerprint_seed, proxy_id, user_agent, timezone, note, tags, is_pinned, group_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
      ).run(
        id,
        data.name.trim(),
        fingerprintSeed,
        data.proxyId ?? null,
        data.userAgent ?? null,
        data.timezone ?? null,
        data.note ?? null,
        data.tags?.length ? JSON.stringify(data.tags) : null,
        data.isPinned ? 1 : 0,
        data.groupId ?? null
      );
    } else {
      getDb().prepare(
        `
            INSERT INTO profiles (id, name, fingerprint_seed, proxy_id, user_agent, timezone, note, is_pinned, group_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
      ).run(
        id,
        data.name.trim(),
        fingerprintSeed,
        data.proxyId ?? null,
        data.userAgent ?? null,
        data.timezone ?? null,
        data.note ?? null,
        data.isPinned ? 1 : 0,
        data.groupId ?? null
      );
    }
    const created = this.getById(id);
    if (!created) {
      throw new Error("Failed to create profile.");
    }
    return created;
  }
  update(id, data) {
    const current = this.getById(id);
    if (!current) {
      throw new Error(`Profile not found: ${id}`);
    }
    const updates = [];
    const values = [];
    if (typeof data.name === "string") {
      updates.push("name = ?");
      values.push(data.name.trim());
    }
    if (typeof data.proxyId === "string" || data.proxyId === void 0) {
      updates.push("proxy_id = ?");
      values.push(data.proxyId ?? null);
    }
    if (typeof data.userAgent === "string" || data.userAgent === void 0) {
      updates.push("user_agent = ?");
      values.push(data.userAgent ?? null);
    }
    if (typeof data.fingerprintSeed === "number") {
      updates.push("fingerprint_seed = ?");
      values.push(Math.abs(Math.trunc(data.fingerprintSeed)) || crypto.randomInt(1e5, 999999));
    }
    if (typeof data.timezone === "string" || data.timezone === void 0) {
      updates.push("timezone = ?");
      values.push(data.timezone ?? null);
    }
    if (typeof data.note === "string" || data.note === void 0) {
      updates.push("note = ?");
      values.push(data.note ?? null);
    }
    if (typeof data.groupId === "string" || data.groupId === void 0) {
      updates.push("group_id = ?");
      values.push(data.groupId ?? null);
    }
    if (this.hasTagsColumn && (Array.isArray(data.tags) || data.tags === void 0)) {
      updates.push("tags = ?");
      values.push(data.tags?.length ? JSON.stringify(data.tags) : null);
    }
    if (typeof data.isPinned === "boolean") {
      updates.push("is_pinned = ?");
      values.push(data.isPinned ? 1 : 0);
    }
    if (typeof data.lastOpened === "string" || data.lastOpened === void 0) {
      updates.push("last_opened = ?");
      values.push(data.lastOpened ?? null);
    }
    if (updates.length > 0) {
      values.push(id);
      getDb().prepare(`UPDATE profiles SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    }
    const updated = this.getById(id);
    if (!updated) {
      throw new Error(`Failed to update profile: ${id}`);
    }
    return updated;
  }
  delete(id) {
    getDb().prepare("DELETE FROM profiles WHERE id = ?").run(id);
  }
}
function toProxy(row) {
  const normalizedProtocol = row.protocol.toLowerCase() === "socks5" ? "socks5" : "http";
  return {
    id: row.id,
    alias: row.alias ?? `${row.host}:${row.port}`,
    protocol: normalizedProtocol,
    host: row.host,
    port: row.port,
    username: row.username ?? void 0,
    password: row.password ?? void 0,
    lastTested: row.last_tested ?? void 0,
    testStatus: "unknown"
  };
}
class ProxyRepository {
  list() {
    const rows = getDb().prepare(
      `
          SELECT id, alias, protocol, host, port, username, password, last_tested
          FROM proxies
          ORDER BY datetime(created_at) DESC
        `
    ).all();
    return rows.map(toProxy);
  }
  getById(id) {
    const row = getDb().prepare(
      `
          SELECT id, alias, protocol, host, port, username, password, last_tested
          FROM proxies
          WHERE id = ?
        `
    ).get(id);
    return row ? toProxy(row) : null;
  }
  create(data) {
    if (!data.host || !data.host.trim()) {
      throw new Error("Proxy host is required.");
    }
    const id = data.id ?? crypto.randomUUID();
    const protocol = data.protocol === "socks5" ? "socks5" : "http";
    const port = Number(data.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("Proxy port must be an integer between 1 and 65535.");
    }
    getDb().prepare(
      `
          INSERT INTO proxies (id, alias, protocol, host, port, username, password)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
    ).run(
      id,
      data.alias?.trim() || `${data.host.trim()}:${port}`,
      protocol,
      data.host.trim(),
      port,
      data.username?.trim() || null,
      data.password || null
    );
    const created = this.getById(id);
    if (!created) {
      throw new Error("Failed to create proxy.");
    }
    return created;
  }
  update(id, data) {
    const current = this.getById(id);
    if (!current) {
      throw new Error(`Proxy not found: ${id}`);
    }
    const updates = [];
    const values = [];
    if (typeof data.alias === "string") {
      updates.push("alias = ?");
      values.push(data.alias.trim());
    }
    if (typeof data.host === "string") {
      if (!data.host.trim()) {
        throw new Error("Proxy host is required.");
      }
      updates.push("host = ?");
      values.push(data.host.trim());
    }
    if (typeof data.protocol === "string") {
      updates.push("protocol = ?");
      values.push(data.protocol === "socks5" ? "socks5" : "http");
    }
    if (typeof data.port === "number") {
      if (!Number.isInteger(data.port) || data.port < 1 || data.port > 65535) {
        throw new Error("Proxy port must be an integer between 1 and 65535.");
      }
      updates.push("port = ?");
      values.push(data.port);
    }
    if (typeof data.username === "string" || data.username === void 0) {
      updates.push("username = ?");
      values.push(data.username?.trim() || null);
    }
    if (typeof data.password === "string" || data.password === void 0) {
      updates.push("password = ?");
      values.push(data.password || null);
    }
    if (typeof data.lastTested === "string" || data.lastTested === void 0) {
      updates.push("last_tested = ?");
      values.push(data.lastTested || null);
    }
    if (updates.length > 0) {
      values.push(id);
      getDb().prepare(`UPDATE proxies SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }
    const updated = this.getById(id);
    if (!updated) {
      throw new Error(`Failed to update proxy: ${id}`);
    }
    return updated;
  }
  delete(id) {
    getDb().prepare("DELETE FROM proxies WHERE id = ?").run(id);
  }
}
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
];
const LANGUAGES = ["en-US,en;q=0.9", "en-GB,en;q=0.9", "vi-VN,vi;q=0.9,en-US;q=0.8"];
const BRANDS = ["Chromium", "Chrome", "Edge", "Opera", "Vivaldi"];
const WEBGL_PROFILES = [
  {
    vendor: "Google Inc. (NVIDIA)",
    renderer: "ANGLE (NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)",
    angleBackend: "d3d11"
  },
  {
    vendor: "Google Inc. (Intel)",
    renderer: "ANGLE (Intel, Intel(R) UHD Graphics OpenGL Engine, OpenGL 4.1)",
    angleBackend: "gl"
  },
  {
    vendor: "Google Inc. (Apple)",
    renderer: "ANGLE (Apple M2, Apple M2, Metal)",
    angleBackend: "metal"
  },
  {
    vendor: "Google Inc. (AMD)",
    renderer: "ANGLE (AMD Radeon RX 6700 XT Vulkan 1.3)",
    angleBackend: "vulkan"
  }
];
function normalizeSeed(seed) {
  if (!Number.isFinite(seed)) return 123456;
  const intSeed = Math.abs(Math.trunc(seed));
  return intSeed === 0 ? 123456 : intSeed;
}
function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 1831565813;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function pick(values, random) {
  const index = Math.floor(random() * values.length);
  return values[index];
}
function randomHex(size, random) {
  let output = "";
  for (let i = 0; i < size; i += 1) {
    output += Math.floor(random() * 16).toString(16);
  }
  return output;
}
function normalizePlatform(platform2) {
  if (platform2 === "win32") return "windows";
  if (platform2 === "darwin") return "macos";
  return "linux";
}
function normalizeLanguageHeader(value) {
  return value.split(",").map((part) => part.trim()).filter(Boolean).join(",");
}
function primaryLanguage(value) {
  return value.split(",")[0].trim() || "en-US";
}
function buildFingerprintProfile(seed) {
  const normalizedSeed = normalizeSeed(seed);
  const random = mulberry32(normalizedSeed);
  const width = pick([1366, 1440, 1536, 1680, 1728, 1920], random);
  const height = pick([768, 900, 960, 1024, 1080], random);
  return {
    seed: normalizedSeed,
    userAgent: pick(USER_AGENTS, random),
    language: pick(LANGUAGES, random),
    webgl: pick(WEBGL_PROFILES, random),
    canvasSalt: randomHex(16, random),
    windowSize: `${width},${height}`,
    deviceScaleFactor: pick(["1", "1.25", "1.5", "2"], random),
    hardwareConcurrency: pick([4, 6, 8, 10, 12, 16], random),
    brand: pick(BRANDS, random),
    brandVersion: pick(["120", "121", "122", "123", "124"], random)
  };
}
function buildFingerprintLaunchArgs(seed, options = {}) {
  const profile = buildFingerprintProfile(seed);
  const platform2 = normalizePlatform(options.platform ?? process.platform);
  const acceptLanguage = normalizeLanguageHeader(options.language ?? profile.language);
  const language = primaryLanguage(acceptLanguage);
  const timezone = options.timezone?.trim() || "UTC";
  const userAgent = options.customUserAgent?.trim() || profile.userAgent;
  const spoofingArg = options.disableSpoofing?.length ? [`--disable-spoofing=${options.disableSpoofing.join(",")}`] : [];
  return [
    `--fingerprint=${profile.seed}`,
    `--fingerprint-platform=${platform2}`,
    `--fingerprint-brand=${profile.brand}`,
    `--fingerprint-brand-version=${profile.brandVersion}`,
    `--fingerprint-hardware-concurrency=${profile.hardwareConcurrency}`,
    "--disable-non-proxied-udp",
    `--lang=${language}`,
    `--accept-lang=${acceptLanguage}`,
    `--timezone=${timezone}`,
    ...spoofingArg,
    `--user-agent=${userAgent}`,
    `--window-size=${profile.windowSize}`,
    `--force-device-scale-factor=${profile.deviceScaleFactor}`,
    "--disable-blink-features=AutomationControlled"
  ];
}
const activeProxyTunnels = /* @__PURE__ */ new Map();
function buildProxyUrl(proxy) {
  const auth = proxy.username ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password ?? "")}@` : "";
  return `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
}
async function createProxyTunnel(profileId, proxy) {
  const existingTunnel = activeProxyTunnels.get(profileId);
  if (existingTunnel) {
    await proxyChain.closeAnonymizedProxy(existingTunnel, true);
    activeProxyTunnels.delete(profileId);
  }
  const proxyUrl = buildProxyUrl(proxy);
  const tunnelUrl = await proxyChain.anonymizeProxy(proxyUrl);
  activeProxyTunnels.set(profileId, tunnelUrl);
  return tunnelUrl;
}
async function closeProxyTunnel(profileId) {
  const tunnelUrl = activeProxyTunnels.get(profileId);
  if (!tunnelUrl) {
    return;
  }
  await proxyChain.closeAnonymizedProxy(tunnelUrl, true);
  activeProxyTunnels.delete(profileId);
}
const processMap = /* @__PURE__ */ new Map();
function setProfileProcess(profileId, child) {
  processMap.set(profileId, child);
}
function getProfileProcess(profileId) {
  return processMap.get(profileId);
}
function hasRunningProfileProcess(profileId) {
  const child = processMap.get(profileId);
  return Boolean(child && child.exitCode === null && !child.killed);
}
function removeProfileProcess(profileId) {
  processMap.delete(profileId);
}
function broadcastProfileStatus(state) {
  for (const window of electron.BrowserWindow.getAllWindows()) {
    window.webContents.send(IPC_CHANNELS.STATUS_PROFILE_CHANGED, state);
  }
}
function broadcastProfileError(profileId, message) {
  broadcastProfileStatus({
    profileId,
    status: "error",
    error: message
  });
}
function toExtension(row) {
  return {
    id: row.id,
    profileId: row.profile_id,
    extensionName: row.extension_name,
    extensionPath: row.extension_path,
    source: row.source,
    sourceRef: row.source_ref ?? void 0,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at
  };
}
class ExtensionRepository {
  list(profileId) {
    return getDb().prepare(
      `
          SELECT id, profile_id, extension_name, extension_path, source, source_ref, enabled, created_at
          FROM profile_extensions
          WHERE profile_id = ?
          ORDER BY datetime(created_at) DESC
        `
    ).all(profileId).map((row) => toExtension(row));
  }
  listEnabled(profileId) {
    return getDb().prepare(
      `
          SELECT id, profile_id, extension_name, extension_path, source, source_ref, enabled, created_at
          FROM profile_extensions
          WHERE profile_id = ? AND enabled = 1
          ORDER BY datetime(created_at) DESC
        `
    ).all(profileId).map((row) => toExtension(row));
  }
  add(profileId, data) {
    const id = crypto.randomUUID();
    getDb().prepare(
      `
          INSERT INTO profile_extensions (id, profile_id, extension_name, extension_path, source, source_ref, enabled)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `
    ).run(id, profileId, data.extensionName, data.extensionPath, data.source, data.sourceRef ?? null);
    const created = this.getById(profileId, id);
    if (!created) {
      throw new Error("Failed to create extension record.");
    }
    return created;
  }
  toggle(profileId, extensionId, enabled) {
    getDb().prepare("UPDATE profile_extensions SET enabled = ? WHERE id = ? AND profile_id = ?").run(enabled ? 1 : 0, extensionId, profileId);
  }
  delete(profileId, extensionId) {
    getDb().prepare("DELETE FROM profile_extensions WHERE id = ? AND profile_id = ?").run(extensionId, profileId);
  }
  getById(profileId, extensionId) {
    const row = getDb().prepare(
      `
          SELECT id, profile_id, extension_name, extension_path, source, source_ref, enabled, created_at
          FROM profile_extensions
          WHERE id = ? AND profile_id = ?
        `
    ).get(extensionId, profileId);
    return row ? toExtension(row) : null;
  }
}
const AdmZip = require("adm-zip");
const profileRepo$5 = new ProfileRepository();
const extensionRepo = new ExtensionRepository();
function ensureProfile(profileId) {
  const profile = profileRepo$5.getById(profileId);
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }
}
function ensureNotRunning$1(profileId) {
  if (hasRunningProfileProcess(profileId)) {
    throw new Error("Profile is currently running. Please stop it before changing extensions.");
  }
}
function extensionBaseDir(profileId) {
  const dir = path.join(electron.app.getPath("userData"), "profiles", profileId, "extensions");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9-_]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || crypto.randomUUID();
}
function parseWebstoreExtensionId(url) {
  const match = url.match(/\/detail\/[a-zA-Z0-9-_]+\/([a-p]{32})/);
  return match?.[1] ?? null;
}
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const request = https.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        output.close();
        fs.unlinkSync(outputPath);
        void downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
        return;
      }
      if (!response.statusCode || response.statusCode >= 400) {
        reject(new Error(`Failed to download file: HTTP ${response.statusCode ?? "unknown"}`));
        return;
      }
      response.pipe(output);
      output.on("finish", () => {
        output.close();
        resolve();
      });
    });
    request.on("error", (error) => {
      output.close();
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      reject(error);
    });
  });
}
function extractCrxToDirectory(crxPath, targetDir) {
  const buffer = fs.readFileSync(crxPath);
  const zipHeader = Buffer.from([80, 75, 3, 4]);
  const zipOffset = buffer.indexOf(zipHeader);
  if (zipOffset < 0) {
    throw new Error("Invalid CRX file: ZIP payload not found.");
  }
  const zipBuffer = buffer.subarray(zipOffset);
  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(targetDir, true);
}
function resolveExtensionName(unpackedDir) {
  const manifestPath = path.join(unpackedDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return path.basename(unpackedDir);
  }
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed.name?.trim() || path.basename(unpackedDir);
  } catch {
    return path.basename(unpackedDir);
  }
}
function listProfileExtensions(profileId) {
  ensureProfile(profileId);
  return extensionRepo.list(profileId);
}
function listEnabledExtensionPaths(profileId) {
  return extensionRepo.listEnabled(profileId).map((record) => record.extensionPath).filter((extensionPath) => fs.existsSync(extensionPath));
}
function installExtensionFromUnpacked(profileId, directoryPath) {
  ensureProfile(profileId);
  ensureNotRunning$1(profileId);
  const sourceDir = directoryPath.trim();
  if (!sourceDir || !fs.existsSync(sourceDir)) {
    throw new Error("Unpacked extension directory does not exist.");
  }
  const name = resolveExtensionName(sourceDir);
  const targetDir = path.join(extensionBaseDir(profileId), `${sanitizeName(name)}_${Date.now()}`);
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  extensionRepo.add(profileId, {
    extensionName: name,
    extensionPath: targetDir,
    source: "unpacked",
    sourceRef: sourceDir
  });
}
function installExtensionFromCrx(profileId, crxPath) {
  ensureProfile(profileId);
  ensureNotRunning$1(profileId);
  const sourceCrxPath = crxPath.trim();
  if (!sourceCrxPath || !fs.existsSync(sourceCrxPath)) {
    throw new Error("CRX file does not exist.");
  }
  const extensionName = sanitizeName(path.basename(sourceCrxPath, path.extname(sourceCrxPath)));
  const targetDir = path.join(extensionBaseDir(profileId), `${extensionName}_${Date.now()}`);
  fs.mkdirSync(targetDir, { recursive: true });
  extractCrxToDirectory(sourceCrxPath, targetDir);
  const resolvedName = resolveExtensionName(targetDir);
  extensionRepo.add(profileId, {
    extensionName: resolvedName,
    extensionPath: targetDir,
    source: "crx",
    sourceRef: sourceCrxPath
  });
}
async function installExtensionFromWebstore(profileId, webstoreUrl) {
  ensureProfile(profileId);
  ensureNotRunning$1(profileId);
  const extensionId = parseWebstoreExtensionId(webstoreUrl.trim());
  if (!extensionId) {
    throw new Error("Invalid Chrome Web Store URL. Cannot extract extension id.");
  }
  const downloadUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=122.0.0.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`;
  const tmpCrxPath = path.join(os.tmpdir(), `${extensionId}_${Date.now()}.crx`);
  try {
    await downloadFile(downloadUrl, tmpCrxPath);
    const targetDir = path.join(extensionBaseDir(profileId), `${extensionId}_${Date.now()}`);
    fs.mkdirSync(targetDir, { recursive: true });
    extractCrxToDirectory(tmpCrxPath, targetDir);
    const extensionName = resolveExtensionName(targetDir);
    extensionRepo.add(profileId, {
      extensionName,
      extensionPath: targetDir,
      source: "webstore",
      sourceRef: webstoreUrl.trim()
    });
  } finally {
    if (fs.existsSync(tmpCrxPath)) {
      fs.unlinkSync(tmpCrxPath);
    }
  }
}
function removeProfileExtension(profileId, extensionId) {
  ensureProfile(profileId);
  ensureNotRunning$1(profileId);
  const existing = extensionRepo.list(profileId).find((item) => item.id === extensionId);
  if (!existing) {
    throw new Error("Extension not found.");
  }
  extensionRepo.delete(profileId, extensionId);
  if (fs.existsSync(existing.extensionPath)) {
    fs.rmSync(existing.extensionPath, { recursive: true, force: true });
  }
}
function toggleProfileExtension(profileId, extensionId, enabled) {
  ensureProfile(profileId);
  ensureNotRunning$1(profileId);
  extensionRepo.toggle(profileId, extensionId, enabled);
}
const proxyRepository = new ProxyRepository();
function profileUserDataDir(profileId) {
  const dir = path.join(electron.app.getPath("userData"), "profiles", profileId, "user-data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
function buildChromiumArgs(profile, proxyServerUrl) {
  const userDataDir = profileUserDataDir(profile.id);
  const fingerprintArgs = buildFingerprintLaunchArgs(profile.fingerprintSeed, {
    customUserAgent: profile.userAgent,
    timezone: profile.timezone,
    language: profile.language,
    platform: process.platform
  });
  const args = [
    `--user-data-dir=${userDataDir}`,
    ...fingerprintArgs,
    "--no-first-run",
    "--no-default-browser-check",
    "--new-window",
    "https://google.com"
  ];
  if (proxyServerUrl) {
    args.splice(1, 0, `--proxy-server=${proxyServerUrl}`);
  }
  const extensionPaths = listEnabledExtensionPaths(profile.id);
  if (extensionPaths.length > 0) {
    const joined = extensionPaths.join(",");
    args.splice(1, 0, `--disable-extensions-except=${joined}`);
    args.splice(2, 0, `--load-extension=${joined}`);
  }
  return args;
}
async function launchProfiles(profileIds, repo) {
  const errors = [];
  for (const profileId of profileIds) {
    const existing = getProfileProcess(profileId);
    if (existing && existing.exitCode === null && !existing.killed) {
      continue;
    }
    broadcastProfileStatus({ profileId, status: "idle" });
    const profile = repo.getById(profileId);
    if (!profile) {
      errors.push(`Profile not found: ${profileId}`);
      broadcastProfileError(profileId, `Profile not found: ${profileId}`);
      continue;
    }
    try {
      let proxyServerUrl;
      if (profile.proxyId) {
        const proxyConfig = proxyRepository.getById(profile.proxyId);
        if (!proxyConfig) {
          errors.push(`Proxy not found for profile ${profileId}: ${profile.proxyId}`);
          broadcastProfileError(profileId, `Proxy not found: ${profile.proxyId}`);
          continue;
        }
        proxyServerUrl = await createProxyTunnel(profile.id, proxyConfig);
      }
      const chromium = await ensureChromiumBinary();
      const child = child_process.spawn(chromium.path, buildChromiumArgs(profile, proxyServerUrl), {
        detached: true,
        stdio: "ignore"
      });
      child.unref();
      setProfileProcess(profile.id, child);
      broadcastProfileStatus({ profileId: profile.id, status: "running" });
      child.once("exit", () => {
        removeProfileProcess(profile.id);
        broadcastProfileStatus({ profileId: profile.id, status: "idle" });
        void closeProxyTunnel(profile.id);
      });
      repo.update(profile.id, { lastOpened: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to launch ${profileId}: ${message}`);
      broadcastProfileError(profileId, message);
    }
  }
  return errors.length > 0 ? { success: false, errors } : { success: true };
}
async function stopProfiles(profileIds) {
  const errors = [];
  for (const profileId of profileIds) {
    const child = getProfileProcess(profileId);
    if (!child) {
      continue;
    }
    const pid = child.pid;
    if (!pid) {
      removeProfileProcess(profileId);
      broadcastProfileStatus({ profileId, status: "idle" });
      continue;
    }
    try {
      if (process.platform === "win32") {
        process.kill(pid, "SIGTERM");
      } else {
        process.kill(-pid, "SIGTERM");
      }
      removeProfileProcess(profileId);
      broadcastProfileStatus({ profileId, status: "idle" });
      await closeProxyTunnel(profileId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to stop ${profileId}: ${message}`);
      broadcastProfileError(profileId, message);
    }
  }
  return errors.length > 0 ? { success: false, errors } : { success: true };
}
const profileRepo$4 = new ProfileRepository();
function safeReadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}
function writeJson(filePath, payload) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}
function syncBrowserProfileName(profileId, profileName) {
  const userDataDir = path.join(electron.app.getPath("userData"), "profiles", profileId, "user-data");
  const localStatePath = path.join(userDataDir, "Local State");
  const preferencesPath = path.join(userDataDir, "Default", "Preferences");
  const localState = safeReadJson(localStatePath);
  const profileObject = localState.profile && typeof localState.profile === "object" && !Array.isArray(localState.profile) ? localState.profile : {};
  const infoCache = profileObject.info_cache && typeof profileObject.info_cache === "object" && !Array.isArray(profileObject.info_cache) ? profileObject.info_cache : {};
  const defaultInfo = infoCache.Default && typeof infoCache.Default === "object" && !Array.isArray(infoCache.Default) ? infoCache.Default : {};
  defaultInfo.name = profileName;
  infoCache.Default = defaultInfo;
  profileObject.info_cache = infoCache;
  localState.profile = profileObject;
  writeJson(localStatePath, localState);
  const preferences = safeReadJson(preferencesPath);
  const preferencesProfile = preferences.profile && typeof preferences.profile === "object" && !Array.isArray(preferences.profile) ? preferences.profile : {};
  preferencesProfile.name = profileName;
  preferences.profile = preferencesProfile;
  writeJson(preferencesPath, preferences);
}
function setupProfileHandlers() {
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_GET_ALL, async () => {
    return profileRepo$4.list();
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_CREATE, async (_event, data) => {
    return profileRepo$4.create(data);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_UPDATE, async (_event, id, data) => {
    const updated = profileRepo$4.update(id, data);
    if (typeof data.name === "string" && data.name.trim()) {
      syncBrowserProfileName(id, data.name.trim());
    }
    return updated;
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_DELETE, async (_event, id) => {
    profileRepo$4.delete(id);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_START, async (_event, profileIds) => {
    return launchProfiles(profileIds, profileRepo$4);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_STOP, async (_event, profileIds) => {
    return stopProfiles(profileIds);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_OPEN_FOLDER, async (_event, profileId) => {
    const profile = profileRepo$4.getById(profileId);
    if (!profile) {
      return { success: false, error: `Profile not found: ${profileId}` };
    }
    const folderPath = path.join(electron.app.getPath("userData"), "profiles", profileId);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const openError = await electron.shell.openPath(folderPath);
    if (openError) {
      return { success: false, error: openError };
    }
    return { success: true };
  });
}
const proxyRepo = new ProxyRepository();
function setupProxyHandlers() {
  electron.ipcMain.handle(IPC_CHANNELS.PROXIES_GET_ALL, async () => {
    return proxyRepo.list();
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROXIES_CREATE, async (_event, data) => {
    return proxyRepo.create(data);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROXIES_UPDATE, async (_event, id, data) => {
    return proxyRepo.update(id, data);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROXIES_DELETE, async (_event, id) => {
    proxyRepo.delete(id);
  });
}
function toGroup(row) {
  return {
    id: row.id,
    name: row.name
  };
}
class GroupRepository {
  list() {
    const rows = getDb().prepare(
      `
          SELECT id, name
          FROM groups
          ORDER BY datetime(created_at) DESC
        `
    ).all();
    return rows.map(toGroup);
  }
  getById(id) {
    const row = getDb().prepare(
      `
          SELECT id, name
          FROM groups
          WHERE id = ?
        `
    ).get(id);
    return row ? toGroup(row) : null;
  }
  create(data) {
    if (!data.name || !data.name.trim()) {
      throw new Error("Group name is required.");
    }
    const id = data.id ?? crypto.randomUUID();
    getDb().prepare(
      `
          INSERT INTO groups (id, name)
          VALUES (?, ?)
        `
    ).run(id, data.name.trim());
    const created = this.getById(id);
    if (!created) {
      throw new Error("Failed to create group.");
    }
    return created;
  }
  update(id, data) {
    const current = this.getById(id);
    if (!current) {
      throw new Error(`Group not found: ${id}`);
    }
    if (typeof data.name === "string") {
      if (!data.name.trim()) {
        throw new Error("Group name is required.");
      }
      getDb().prepare("UPDATE groups SET name = ? WHERE id = ?").run(data.name.trim(), id);
    }
    const updated = this.getById(id);
    if (!updated) {
      throw new Error(`Failed to update group: ${id}`);
    }
    return updated;
  }
  delete(id) {
    getDb().prepare("DELETE FROM groups WHERE id = ?").run(id);
  }
}
const groupRepo = new GroupRepository();
function setupGroupHandlers() {
  electron.ipcMain.handle(IPC_CHANNELS.GROUPS_GET_ALL, async () => {
    return groupRepo.list();
  });
  electron.ipcMain.handle(IPC_CHANNELS.GROUPS_CREATE, async (_event, data) => {
    return groupRepo.create(data);
  });
  electron.ipcMain.handle(IPC_CHANNELS.GROUPS_UPDATE, async (_event, id, data) => {
    return groupRepo.update(id, data);
  });
  electron.ipcMain.handle(IPC_CHANNELS.GROUPS_DELETE, async (_event, id) => {
    groupRepo.delete(id);
  });
}
async function runWithConcurrency(items, worker, concurrency = 3) {
  if (items.length === 0) return [];
  const safeConcurrency = Math.max(1, Math.min(concurrency, 10));
  const queue = [...items];
  const results = [];
  const runWorker = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      try {
        await worker(item);
        results.push({ item, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ item, success: false, error: message });
      }
    }
  };
  const workers = Array.from({ length: Math.min(safeConcurrency, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}
const profileRepo$3 = new ProfileRepository();
async function bulkOpen(profileIds) {
  const results = await runWithConcurrency(
    profileIds,
    async (profileId) => {
      const openResult = await launchProfiles([profileId], profileRepo$3);
      if (!openResult.success) {
        throw new Error(openResult.errors?.join(", ") ?? `Failed to launch ${profileId}`);
      }
    },
    3
  );
  const errors = results.filter((result) => !result.success).map((result) => `${result.item}: ${result.error ?? "Unknown error"}`);
  return errors.length > 0 ? { success: false, errors } : { success: true };
}
async function bulkClose(profileIds) {
  return stopProfiles(profileIds);
}
async function bulkAssignProxy(profileIds, proxyId) {
  const errors = [];
  for (const profileId of profileIds) {
    try {
      profileRepo$3.update(profileId, { proxyId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${profileId}: ${message}`);
    }
  }
  return errors.length > 0 ? { success: false, errors } : { success: true };
}
async function bulkAssignProxyMap(profileProxyMap) {
  const errors = [];
  for (const [profileId, proxyId] of Object.entries(profileProxyMap)) {
    try {
      profileRepo$3.update(profileId, { proxyId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${profileId}: ${message}`);
    }
  }
  return errors.length > 0 ? { success: false, errors } : { success: true };
}
function setupBulkHandlers() {
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_BULK_OPEN, async (_event, profileIds) => {
    return bulkOpen(profileIds);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_BULK_CLOSE, async (_event, profileIds) => {
    return bulkClose(profileIds);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_BULK_PROXY_ASSIGN, async (_event, profileIds, proxyId) => {
    return bulkAssignProxy(profileIds, proxyId);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_BULK_PROXY_ASSIGN_MAP, async (_event, profileProxyMap) => {
    return bulkAssignProxyMap(profileProxyMap);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_BULK_UPDATE, async (_event, profileIds, updates) => {
    if (Object.prototype.hasOwnProperty.call(updates, "proxyId")) {
      return bulkAssignProxy(profileIds, updates.proxyId);
    }
    return { success: true };
  });
}
const profileRepo$2 = new ProfileRepository();
const CHROMIUM_UNIX_EPOCH_OFFSET_SECONDS = 11644473600;
function getCookieFilePath(profileId, format) {
  const cookieDir = path.join(electron.app.getPath("userData"), "profiles", profileId, "cookies");
  if (!fs.existsSync(cookieDir)) {
    fs.mkdirSync(cookieDir, { recursive: true });
  }
  const fileName = format === "json" ? "cookies.json" : "cookies.txt";
  return path.join(cookieDir, fileName);
}
function getProfileUserDataDir(profileId) {
  return path.join(electron.app.getPath("userData"), "profiles", profileId, "user-data");
}
function getChromiumCookieDbPath(profileId) {
  const userDataDir = getProfileUserDataDir(profileId);
  const candidates = [
    path.join(userDataDir, "Default", "Network", "Cookies"),
    path.join(userDataDir, "Default", "Cookies")
  ];
  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  return existing ?? candidates[0];
}
function toChromiumTimestamp(unixSeconds) {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return 0;
  }
  return Math.trunc((unixSeconds + CHROMIUM_UNIX_EPOCH_OFFSET_SECONDS) * 1e6);
}
function fromChromiumTimestamp(chromiumMicroseconds) {
  if (!chromiumMicroseconds || !Number.isFinite(chromiumMicroseconds) || chromiumMicroseconds <= 0) {
    return 0;
  }
  return Math.max(0, Math.trunc(chromiumMicroseconds / 1e6 - CHROMIUM_UNIX_EPOCH_OFFSET_SECONDS));
}
function toChromiumSameSite(sameSite) {
  if (sameSite === "None") return 1;
  if (sameSite === "Lax") return 2;
  if (sameSite === "Strict") return 3;
  return 0;
}
function fromChromiumSameSite(sameSite) {
  if (sameSite === 1) return "None";
  if (sameSite === 2) return "Lax";
  if (sameSite === 3) return "Strict";
  return void 0;
}
function withCookieDb(profileId, run) {
  const dbPath = getChromiumCookieDbPath(profileId);
  if (!fs.existsSync(dbPath)) {
    return null;
  }
  const db2 = new Database(dbPath);
  try {
    return run(db2);
  } finally {
    db2.close();
  }
}
function getCookiesTableColumns(db2) {
  const rows = db2.prepare("PRAGMA table_info(cookies)").all();
  return new Set(rows.map((row) => row.name));
}
function readCookiesFromChromiumDb(profileId) {
  return withCookieDb(profileId, (db2) => {
    const tables = db2.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'cookies'").all();
    if (tables.length === 0) {
      return [];
    }
    const rows = db2.prepare(
      `
          SELECT host_key, name, value, path, expires_utc, is_secure, is_httponly, samesite
          FROM cookies
          ORDER BY host_key ASC, name ASC
        `
    ).all();
    return rows.map(
      (row) => normalizeCookie({
        domain: row.host_key,
        name: row.name,
        value: row.value ?? "",
        path: row.path ?? "/",
        expires: fromChromiumTimestamp(row.expires_utc),
        secure: Boolean(row.is_secure),
        httpOnly: Boolean(row.is_httponly),
        sameSite: fromChromiumSameSite(row.samesite)
      })
    ).filter((cookie) => cookie.domain && cookie.name);
  });
}
function writeCookiesToChromiumDb(profileId, cookies) {
  const result = withCookieDb(profileId, (db2) => {
    const tableExists = db2.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'cookies'").get();
    if (!tableExists) {
      return false;
    }
    const columns = getCookiesTableColumns(db2);
    const nowChromium = toChromiumTimestamp(Math.trunc(Date.now() / 1e3));
    const apply = db2.transaction((items) => {
      const deleteStatement = db2.prepare("DELETE FROM cookies WHERE host_key = ? AND name = ? AND path = ?");
      for (const cookie of items) {
        deleteStatement.run(cookie.domain, cookie.name, cookie.path || "/");
        const valuesByColumn = {
          creation_utc: nowChromium,
          host_key: cookie.domain,
          name: cookie.name,
          value: cookie.value,
          path: cookie.path || "/",
          expires_utc: toChromiumTimestamp(cookie.expires),
          is_secure: cookie.secure ? 1 : 0,
          is_httponly: cookie.httpOnly ? 1 : 0,
          last_access_utc: nowChromium,
          has_expires: cookie.expires > 0 ? 1 : 0,
          is_persistent: cookie.expires > 0 ? 1 : 0,
          priority: 1,
          samesite: toChromiumSameSite(cookie.sameSite),
          source_scheme: cookie.secure ? 2 : 1,
          source_port: 443,
          last_update_utc: nowChromium,
          source_type: 0,
          is_same_party: 0,
          same_party_context: 0
        };
        const insertColumns = Object.keys(valuesByColumn).filter((column) => columns.has(column));
        const placeholders = insertColumns.map(() => "?").join(", ");
        const insertSql = `INSERT INTO cookies (${insertColumns.join(", ")}) VALUES (${placeholders})`;
        const insertValues = insertColumns.map((column) => valuesByColumn[column]);
        db2.prepare(insertSql).run(...insertValues);
      }
    });
    apply(cookies);
    return true;
  });
  return Boolean(result);
}
function clearCookiesFromChromiumDb(profileId) {
  const result = withCookieDb(profileId, (db2) => {
    const tableExists = db2.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'cookies'").get();
    if (!tableExists) {
      return false;
    }
    db2.prepare("DELETE FROM cookies").run();
    return true;
  });
  return Boolean(result);
}
function normalizeCookie(input) {
  return {
    domain: String(input.domain ?? ""),
    name: String(input.name ?? ""),
    value: String(input.value ?? ""),
    path: String(input.path ?? "/"),
    expires: Number.isFinite(input.expires) ? Number(input.expires) : 0,
    secure: Boolean(input.secure),
    httpOnly: Boolean(input.httpOnly),
    sameSite: input.sameSite === "Strict" || input.sameSite === "Lax" || input.sameSite === "None" ? input.sameSite : void 0
  };
}
function parseJsonCookies(content) {
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error("JSON cookies must be an array.");
  }
  return parsed.map((entry) => normalizeCookie(entry ?? {})).filter((cookie) => cookie.domain && cookie.name);
}
function parseNetscapeCookies(content) {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  const cookies = [];
  for (const line of lines) {
    const parts = line.split("	");
    if (parts.length < 7) {
      continue;
    }
    const [domain, , cookiePath, secure, expires, name, ...valueParts] = parts;
    cookies.push(
      normalizeCookie({
        domain,
        path: cookiePath || "/",
        secure: secure.toUpperCase() === "TRUE",
        expires: Number.parseInt(expires, 10) || 0,
        name,
        value: valueParts.join("	")
      })
    );
  }
  return cookies.filter((cookie) => cookie.domain && cookie.name);
}
function serializeJsonCookies(cookies) {
  return JSON.stringify(cookies, null, 2);
}
function serializeNetscapeCookies(cookies) {
  const header = "# Netscape HTTP Cookie File\n# This file was generated by Multi-Profile Browser Manager\n";
  const lines = cookies.map((cookie) => {
    const includeSubdomains = cookie.domain.startsWith(".") ? "TRUE" : "FALSE";
    const secure = cookie.secure ? "TRUE" : "FALSE";
    return [
      cookie.domain,
      includeSubdomains,
      cookie.path || "/",
      secure,
      String(cookie.expires || 0),
      cookie.name,
      cookie.value
    ].join("	");
  });
  return `${header}${lines.join("\n")}
`;
}
function parseCookies(content, format) {
  if (!content.trim()) {
    return [];
  }
  return format === "json" ? parseJsonCookies(content) : parseNetscapeCookies(content);
}
function serializeCookies(cookies, format) {
  return format === "json" ? serializeJsonCookies(cookies) : serializeNetscapeCookies(cookies);
}
function ensureProfileExists(profileId) {
  const profile = profileRepo$2.getById(profileId);
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }
}
function setupCookieHandlers() {
  electron.ipcMain.handle(IPC_CHANNELS.COOKIES_READ, async (_event, profileId, format) => {
    try {
      ensureProfileExists(profileId);
      const chromiumCookies = readCookiesFromChromiumDb(profileId);
      if (chromiumCookies) {
        return {
          success: true,
          format,
          cookies: chromiumCookies,
          content: serializeCookies(chromiumCookies, format)
        };
      }
      const filePath = getCookieFilePath(profileId, format);
      if (!fs.existsSync(filePath)) {
        return { success: true, format, cookies: [], content: "" };
      }
      const content = fs.readFileSync(filePath, "utf8");
      const cookies = parseCookies(content, format);
      return { success: true, format, cookies, content };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, format, cookies: [], content: "", error: message };
    }
  });
  electron.ipcMain.handle(
    IPC_CHANNELS.COOKIES_WRITE,
    async (_event, profileId, format, content) => {
      try {
        ensureProfileExists(profileId);
        const cookies = parseCookies(content, format);
        const serialized = serializeCookies(cookies, format);
        const filePath = getCookieFilePath(profileId, format);
        fs.writeFileSync(filePath, serialized, "utf8");
        writeCookiesToChromiumDb(profileId, cookies);
        return { success: true, count: cookies.length };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, count: 0, error: message };
      }
    }
  );
  electron.ipcMain.handle(IPC_CHANNELS.COOKIES_CLEAR, async (_event, profileId) => {
    try {
      ensureProfileExists(profileId);
      for (const format of ["json", "netscape"]) {
        const filePath = getCookieFilePath(profileId, format);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      clearCookiesFromChromiumDb(profileId);
      return { success: true, count: 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, count: 0, error: message };
    }
  });
}
function toBookmark(row) {
  return {
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    url: row.url,
    folder: row.folder ?? void 0,
    createdAt: row.created_at
  };
}
function chromiumTimestamp() {
  const epoch = Date.UTC(1601, 0, 1);
  const now = Date.now();
  return String((now - epoch) * 1e3);
}
function profileBookmarksFile(profileId) {
  const filePath = path.join(electron.app.getPath("userData"), "profiles", profileId, "user-data", "Default", "Bookmarks");
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return filePath;
}
function ensureNotRunning(profileId) {
  if (hasRunningProfileProcess(profileId)) {
    throw new Error("Profile is currently running. Please restart profile after closing browser before modifying bookmarks.");
  }
}
class BookmarkRepository {
  profileRepo = new ProfileRepository();
  list(profileId) {
    return getDb().prepare(
      `
          SELECT id, profile_id, title, url, folder, created_at
          FROM profile_bookmarks
          WHERE profile_id = ?
          ORDER BY datetime(created_at) DESC
        `
    ).all(profileId).map((row) => toBookmark(row));
  }
  add(profileId, data) {
    this.ensureProfile(profileId);
    ensureNotRunning(profileId);
    const normalizedTitle = data.title.trim();
    const normalizedUrl = data.url.trim();
    if (!normalizedTitle) throw new Error("Bookmark title is required.");
    if (!/^https?:\/\//i.test(normalizedUrl)) throw new Error("Bookmark URL must start with http:// or https://");
    const id = crypto.randomUUID();
    getDb().prepare(
      `
          INSERT INTO profile_bookmarks (id, profile_id, title, url, folder)
          VALUES (?, ?, ?, ?, ?)
        `
    ).run(id, profileId, normalizedTitle, normalizedUrl, data.folder?.trim() || null);
    this.syncChromiumBookmarks(profileId);
    const created = this.getById(profileId, id);
    if (!created) {
      throw new Error("Failed to create bookmark.");
    }
    return created;
  }
  delete(profileId, bookmarkId) {
    this.ensureProfile(profileId);
    ensureNotRunning(profileId);
    getDb().prepare("DELETE FROM profile_bookmarks WHERE id = ? AND profile_id = ?").run(bookmarkId, profileId);
    this.syncChromiumBookmarks(profileId);
  }
  importJson(profileId, jsonContent) {
    this.ensureProfile(profileId);
    ensureNotRunning(profileId);
    const parsed = JSON.parse(jsonContent);
    if (!Array.isArray(parsed)) {
      throw new Error("Bookmark import JSON must be an array.");
    }
    const insert = getDb().prepare(
      "INSERT INTO profile_bookmarks (id, profile_id, title, url, folder) VALUES (?, ?, ?, ?, ?)"
    );
    const insertMany = getDb().transaction((items) => {
      for (const item of items) {
        const title = item.title?.trim();
        const url = item.url?.trim();
        if (!title || !url || !/^https?:\/\//i.test(url)) {
          continue;
        }
        insert.run(crypto.randomUUID(), profileId, title, url, item.folder?.trim() || null);
      }
    });
    const normalized = parsed.map((item) => item).filter((item) => typeof item.title === "string" && typeof item.url === "string").map((item) => ({ title: item.title, url: item.url, folder: item.folder }));
    insertMany(normalized);
    this.syncChromiumBookmarks(profileId);
    return normalized.length;
  }
  getById(profileId, bookmarkId) {
    const row = getDb().prepare(
      `
          SELECT id, profile_id, title, url, folder, created_at
          FROM profile_bookmarks
          WHERE id = ? AND profile_id = ?
        `
    ).get(bookmarkId, profileId);
    return row ? toBookmark(row) : null;
  }
  ensureProfile(profileId) {
    const profile = this.profileRepo.getById(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }
  }
  syncChromiumBookmarks(profileId) {
    const filePath = profileBookmarksFile(profileId);
    const bookmarks = this.list(profileId).reverse();
    const children = bookmarks.map((bookmark, index) => ({
      id: String(index + 1),
      name: bookmark.title,
      type: "url",
      url: bookmark.url,
      date_added: chromiumTimestamp(),
      date_last_used: "0"
    }));
    const payload = {
      checksum: "",
      roots: {
        bookmark_bar: {
          children,
          date_added: chromiumTimestamp(),
          date_modified: chromiumTimestamp(),
          id: "1",
          name: "Bookmarks Bar",
          type: "folder"
        },
        other: {
          children: [],
          date_added: chromiumTimestamp(),
          date_modified: chromiumTimestamp(),
          id: "2",
          name: "Other Bookmarks",
          type: "folder"
        },
        synced: {
          children: [],
          date_added: chromiumTimestamp(),
          date_modified: chromiumTimestamp(),
          id: "3",
          name: "Mobile Bookmarks",
          type: "folder"
        }
      },
      version: 1
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  }
}
const bookmarkRepo = new BookmarkRepository();
function setupBookmarkHandlers() {
  electron.ipcMain.handle(IPC_CHANNELS.BOOKMARKS_LIST, async (_event, profileId) => {
    return bookmarkRepo.list(profileId);
  });
  electron.ipcMain.handle(
    IPC_CHANNELS.BOOKMARKS_ADD,
    async (_event, profileId, bookmark) => {
      try {
        bookmarkRepo.add(profileId, bookmark);
        return { success: true, count: 1 };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, count: 0, error: message };
      }
    }
  );
  electron.ipcMain.handle(IPC_CHANNELS.BOOKMARKS_DELETE, async (_event, profileId, bookmarkId) => {
    try {
      bookmarkRepo.delete(profileId, bookmarkId);
      return { success: true, count: 1 };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, count: 0, error: message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.BOOKMARKS_IMPORT_JSON, async (_event, profileId, jsonContent) => {
    try {
      const count = bookmarkRepo.importJson(profileId, jsonContent);
      return { success: true, count };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, count: 0, error: message };
    }
  });
}
function setupExtensionHandlers() {
  electron.ipcMain.handle(IPC_CHANNELS.EXTENSIONS_LIST, async (_event, profileId) => {
    return listProfileExtensions(profileId);
  });
  electron.ipcMain.handle(IPC_CHANNELS.EXTENSIONS_INSTALL_UNPACKED, async (_event, profileId, directoryPath) => {
    try {
      installExtensionFromUnpacked(profileId, directoryPath);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.EXTENSIONS_INSTALL_CRX, async (_event, profileId, crxPath) => {
    try {
      installExtensionFromCrx(profileId, crxPath);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.EXTENSIONS_INSTALL_WEBSTORE, async (_event, profileId, webstoreUrl) => {
    try {
      await installExtensionFromWebstore(profileId, webstoreUrl);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.EXTENSIONS_REMOVE, async (_event, profileId, extensionId) => {
    try {
      removeProfileExtension(profileId, extensionId);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.EXTENSIONS_TOGGLE, async (_event, profileId, extensionId, enabled) => {
    try {
      toggleProfileExtension(profileId, extensionId, enabled);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  });
}
const archiver = require("archiver");
const profileRepo$1 = new ProfileRepository();
function ensureParentDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
async function exportProfileToZip(profileId, outputFilePath) {
  const profile = profileRepo$1.getById(profileId);
  if (!profile) {
    return { success: false, error: `Profile not found: ${profileId}` };
  }
  const profileBaseDir = path.join(electron.app.getPath("userData"), "profiles", profileId);
  if (!fs.existsSync(profileBaseDir)) {
    return { success: false, error: `Profile directory not found: ${profileBaseDir}` };
  }
  ensureParentDir(outputFilePath);
  return new Promise((resolve) => {
    const output = fs.createWriteStream(outputFilePath);
    const archive = archiver("zip", { zlib: { level: 6 } });
    output.on("close", () => {
      resolve({ success: true, path: outputFilePath });
    });
    output.on("error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      resolve({ success: false, error: message });
    });
    archive.on("error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      resolve({ success: false, error: message });
    });
    archive.pipe(output);
    const userDataDir = path.join(profileBaseDir, "user-data");
    const cookiesDir = path.join(profileBaseDir, "cookies");
    if (fs.existsSync(userDataDir)) {
      archive.directory(userDataDir, "user-data");
    }
    if (fs.existsSync(cookiesDir)) {
      archive.directory(cookiesDir, "cookies");
    }
    archive.append(JSON.stringify(profile, null, 2), { name: "profile.json" });
    void archive.finalize();
  });
}
const profileRepo = new ProfileRepository();
function setupIpcHandlers() {
  setupProfileHandlers();
  setupProxyHandlers();
  setupGroupHandlers();
  setupBulkHandlers();
  setupCookieHandlers();
  setupBookmarkHandlers();
  setupExtensionHandlers();
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_IMPORT_ZIP, async () => {
    console.log("Stub: profiles:importZip");
    return false;
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_EXPORT_ZIP, async (_event, profileId) => {
    const profile = profileRepo.getById(profileId);
    if (!profile) {
      return { success: false, error: `Profile not found: ${profileId}` };
    }
    const safeName = profile.name.replace(/[^a-zA-Z0-9-_]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || profile.id;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const defaultPath = path.join(electron.app.getPath("downloads"), `${safeName}_${timestamp}.zip`);
    const saveResult = await electron.dialog.showSaveDialog({
      title: "Export Profile to ZIP",
      defaultPath,
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }]
    });
    if (saveResult.canceled || !saveResult.filePath) {
      return { success: false, error: "Export canceled by user." };
    }
    return exportProfileToZip(profileId, saveResult.filePath);
  });
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 768,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0c0e12",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.anti-detech");
  initDatabase();
  try {
    const chromium = await ensureChromiumBinary();
    console.log(`Chromium binary ready (${chromium.source}): ${chromium.path}`);
  } catch (error) {
    console.warn("Chromium binary is not ready. Browser launch features will remain unavailable until configured.", error);
  }
  setupIpcHandlers();
  electron.app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
