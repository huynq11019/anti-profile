"use strict";
const electron = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");
const https = require("https");
const crypto = require("crypto");
const child_process = require("child_process");
const proxyChain = require("proxy-chain");
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
function downloadFile(url, outputPath) {
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
        downloadFile(redirect, outputPath).then(resolve).catch(reject);
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
  await downloadFile(downloadUrl, downloadedPath);
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
  PROFILES_IMPORT_ZIP: "profiles:importZip",
  PROFILES_EXPORT_ZIP: "profiles:exportZip",
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
          ORDER BY datetime(created_at) DESC
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
    "about:blank"
  ];
  if (proxyServerUrl) {
    args.splice(1, 0, `--proxy-server=${proxyServerUrl}`);
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
const profileRepo$1 = new ProfileRepository();
function setupProfileHandlers() {
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_GET_ALL, async () => {
    return profileRepo$1.list();
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_CREATE, async (_event, data) => {
    return profileRepo$1.create(data);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_UPDATE, async (_event, id, data) => {
    return profileRepo$1.update(id, data);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_DELETE, async (_event, id) => {
    profileRepo$1.delete(id);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_START, async (_event, profileIds) => {
    return launchProfiles(profileIds, profileRepo$1);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_STOP, async (_event, profileIds) => {
    return stopProfiles(profileIds);
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
const profileRepo = new ProfileRepository();
async function bulkOpen(profileIds) {
  const results = await runWithConcurrency(
    profileIds,
    async (profileId) => {
      const openResult = await launchProfiles([profileId], profileRepo);
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
      profileRepo.update(profileId, { proxyId });
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
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_BULK_UPDATE, async (_event, profileIds, updates) => {
    if (Object.prototype.hasOwnProperty.call(updates, "proxyId")) {
      return bulkAssignProxy(profileIds, updates.proxyId);
    }
    return { success: true };
  });
}
function setupIpcHandlers() {
  setupProfileHandlers();
  setupProxyHandlers();
  setupGroupHandlers();
  setupBulkHandlers();
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_IMPORT_ZIP, async () => {
    console.log("Stub: profiles:importZip");
    return false;
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_EXPORT_ZIP, async (_event, profileId) => {
    console.log("Stub: profiles:exportZip", profileId);
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
