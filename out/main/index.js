"use strict";
const electron = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");
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
        console.error(`Failed to apply migration ${file}:`, err);
        throw err;
      }
    }
  }
  console.log("Database initialized and migrated successfully");
}
const IPC_CHANNELS = {
  PROFILES_GET_ALL: "profiles:getAll",
  PROFILES_CREATE: "profiles:create",
  PROFILES_UPDATE: "profiles:update",
  PROFILES_DELETE: "profiles:delete",
  PROFILES_START: "profiles:start",
  PROFILES_STOP: "profiles:stop",
  PROFILES_BULK_UPDATE: "profiles:bulkUpdate",
  PROFILES_IMPORT_ZIP: "profiles:importZip",
  PROFILES_EXPORT_ZIP: "profiles:exportZip",
  PROXIES_GET_ALL: "proxies:getAll",
  PROXIES_CREATE: "proxies:create",
  PROXIES_UPDATE: "proxies:update",
  PROXIES_DELETE: "proxies:delete"
};
function setupIpcHandlers() {
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_GET_ALL, async () => {
    console.log("Stub: profiles:getAll");
    return [];
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_CREATE, async (_event, data) => {
    console.log("Stub: profiles:create", data);
    return null;
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_UPDATE, async (_event, id, data) => {
    console.log("Stub: profiles:update", id, data);
    return null;
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_DELETE, async (_event, id) => {
    console.log("Stub: profiles:delete", id);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_START, async (_event, profilesIdList) => {
    console.log("Stub: profiles:start", profilesIdList);
    return { success: true };
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_STOP, async (_event, profilesIdList) => {
    console.log("Stub: profiles:stop", profilesIdList);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_BULK_UPDATE, async (_event, profileIds, updates) => {
    console.log("Stub: profiles:bulkUpdate", profileIds, updates);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_IMPORT_ZIP, async () => {
    console.log("Stub: profiles:importZip");
    return false;
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROFILES_EXPORT_ZIP, async (_event, profileId) => {
    console.log("Stub: profiles:exportZip", profileId);
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROXIES_GET_ALL, async () => {
    console.log("Stub: proxies:getAll");
    return [];
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROXIES_CREATE, async (_event, data) => {
    console.log("Stub: proxies:create", data);
    return null;
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROXIES_UPDATE, async (_event, id, data) => {
    console.log("Stub: proxies:update", id, data);
    return null;
  });
  electron.ipcMain.handle(IPC_CHANNELS.PROXIES_DELETE, async (_event, id) => {
    console.log("Stub: proxies:delete", id);
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
electron.app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.anti-detech");
  initDatabase();
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
