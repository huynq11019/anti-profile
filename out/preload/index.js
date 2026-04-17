"use strict";
const electron = require("electron");
const electronAPI = {
  ipcRenderer: {
    send(channel, ...args) {
      electron.ipcRenderer.send(channel, ...args);
    },
    sendTo(webContentsId, channel, ...args) {
      const electronVer = process.versions.electron;
      const electronMajorVer = electronVer ? parseInt(electronVer.split(".")[0]) : 0;
      if (electronMajorVer >= 28) {
        throw new Error('"sendTo" method has been removed since Electron 28.');
      } else {
        electron.ipcRenderer.sendTo(webContentsId, channel, ...args);
      }
    },
    sendSync(channel, ...args) {
      return electron.ipcRenderer.sendSync(channel, ...args);
    },
    sendToHost(channel, ...args) {
      electron.ipcRenderer.sendToHost(channel, ...args);
    },
    postMessage(channel, message, transfer) {
      electron.ipcRenderer.postMessage(channel, message, transfer);
    },
    invoke(channel, ...args) {
      return electron.ipcRenderer.invoke(channel, ...args);
    },
    on(channel, listener) {
      electron.ipcRenderer.on(channel, listener);
      return () => {
        electron.ipcRenderer.removeListener(channel, listener);
      };
    },
    once(channel, listener) {
      electron.ipcRenderer.once(channel, listener);
      return () => {
        electron.ipcRenderer.removeListener(channel, listener);
      };
    },
    removeListener(channel, listener) {
      electron.ipcRenderer.removeListener(channel, listener);
      return this;
    },
    removeAllListeners(channel) {
      electron.ipcRenderer.removeAllListeners(channel);
    }
  },
  webFrame: {
    insertCSS(css) {
      return electron.webFrame.insertCSS(css);
    },
    setZoomFactor(factor) {
      if (typeof factor === "number" && factor > 0) {
        electron.webFrame.setZoomFactor(factor);
      }
    },
    setZoomLevel(level) {
      if (typeof level === "number") {
        electron.webFrame.setZoomLevel(level);
      }
    }
  },
  webUtils: {
    getPathForFile(file) {
      return electron.webUtils.getPathForFile(file);
    }
  },
  process: {
    get platform() {
      return process.platform;
    },
    get versions() {
      return process.versions;
    },
    get env() {
      return { ...process.env };
    }
  }
};
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
  COOKIES_EDIT: "cookies:edit",
  COOKIES_DELETE: "cookies:delete",
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
  STATUS_PROFILE_CHANGED: "status:profileChanged",
  STATUS_SYS_METRICS: "status:sysMetrics",
  UI_ALERTS: "ui:alerts"
};
const api = {
  profiles: {
    getAll: () => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_GET_ALL),
    create: (data) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_CREATE, data),
    update: (id, data) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_UPDATE, id, data),
    delete: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_DELETE, id),
    start: (profilesIdList) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_START, profilesIdList),
    stop: (profilesIdList) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_STOP, profilesIdList),
    bulkUpdate: (profileIds, updates) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_BULK_UPDATE, profileIds, updates),
    bulkOpen: (profileIds) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_BULK_OPEN, profileIds),
    bulkClose: (profileIds) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_BULK_CLOSE, profileIds),
    bulkAssignProxy: (profileIds, proxyId) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_BULK_PROXY_ASSIGN, profileIds, proxyId),
    bulkAssignProxyMap: (profileProxyMap) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_BULK_PROXY_ASSIGN_MAP, profileProxyMap),
    importZip: () => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_IMPORT_ZIP),
    exportZip: (profileId) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_EXPORT_ZIP, profileId),
    openFolder: (profileId) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_OPEN_FOLDER, profileId)
  },
  proxies: {
    getAll: () => electron.ipcRenderer.invoke(IPC_CHANNELS.PROXIES_GET_ALL),
    create: (data) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROXIES_CREATE, data),
    update: (id, data) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROXIES_UPDATE, id, data),
    delete: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROXIES_DELETE, id)
  },
  groups: {
    getAll: () => electron.ipcRenderer.invoke(IPC_CHANNELS.GROUPS_GET_ALL),
    create: (data) => electron.ipcRenderer.invoke(IPC_CHANNELS.GROUPS_CREATE, data),
    update: (id, data) => electron.ipcRenderer.invoke(IPC_CHANNELS.GROUPS_UPDATE, id, data),
    delete: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.GROUPS_DELETE, id)
  },
  cookies: {
    read: (profileId, format) => electron.ipcRenderer.invoke(IPC_CHANNELS.COOKIES_READ, profileId, format),
    write: (profileId, format, content) => electron.ipcRenderer.invoke(IPC_CHANNELS.COOKIES_WRITE, profileId, format, content),
    clear: (profileId) => electron.ipcRenderer.invoke(IPC_CHANNELS.COOKIES_CLEAR, profileId),
    edit: (payload) => electron.ipcRenderer.invoke(IPC_CHANNELS.COOKIES_EDIT, payload),
    delete: (payload) => electron.ipcRenderer.invoke(IPC_CHANNELS.COOKIES_DELETE, payload)
  },
  bookmarks: {
    list: (profileId) => electron.ipcRenderer.invoke(IPC_CHANNELS.BOOKMARKS_LIST, profileId),
    add: (profileId, bookmark) => electron.ipcRenderer.invoke(IPC_CHANNELS.BOOKMARKS_ADD, profileId, bookmark),
    delete: (profileId, bookmarkId) => electron.ipcRenderer.invoke(IPC_CHANNELS.BOOKMARKS_DELETE, profileId, bookmarkId),
    importJson: (profileId, jsonContent) => electron.ipcRenderer.invoke(IPC_CHANNELS.BOOKMARKS_IMPORT_JSON, profileId, jsonContent)
  },
  extensions: {
    list: (profileId) => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_LIST, profileId),
    installUnpacked: (profileId, directoryPath) => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_INSTALL_UNPACKED, profileId, directoryPath),
    installCrx: (profileId, crxPath) => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_INSTALL_CRX, profileId, crxPath),
    installWebstore: (profileId, webstoreUrl) => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_INSTALL_WEBSTORE, profileId, webstoreUrl),
    remove: (profileId, extensionId) => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_REMOVE, profileId, extensionId),
    toggle: (profileId, extensionId, enabled) => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_TOGGLE, profileId, extensionId, enabled)
  },
  onProfileStatusChange: (callback) => {
    const handler = (_event, state) => callback(state);
    electron.ipcRenderer.on(IPC_CHANNELS.STATUS_PROFILE_CHANGED, handler);
    return () => electron.ipcRenderer.removeListener(IPC_CHANNELS.STATUS_PROFILE_CHANGED, handler);
  },
  onSysMetrics: (callback) => {
    const handler = (_event, metrics) => callback(metrics);
    electron.ipcRenderer.on(IPC_CHANNELS.STATUS_SYS_METRICS, handler);
    return () => electron.ipcRenderer.removeListener(IPC_CHANNELS.STATUS_SYS_METRICS, handler);
  },
  onUiAlert: (callback) => {
    const handler = (_event, alert) => callback(alert);
    electron.ipcRenderer.on(IPC_CHANNELS.UI_ALERTS, handler);
    return () => electron.ipcRenderer.removeListener(IPC_CHANNELS.UI_ALERTS, handler);
  }
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
