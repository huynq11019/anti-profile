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
  PROFILES_IMPORT_ZIP: "profiles:importZip",
  PROFILES_EXPORT_ZIP: "profiles:exportZip",
  PROXIES_GET_ALL: "proxies:getAll",
  PROXIES_CREATE: "proxies:create",
  PROXIES_UPDATE: "proxies:update",
  PROXIES_DELETE: "proxies:delete",
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
    importZip: () => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_IMPORT_ZIP),
    exportZip: (profileId) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROFILES_EXPORT_ZIP, profileId)
  },
  proxies: {
    getAll: () => electron.ipcRenderer.invoke(IPC_CHANNELS.PROXIES_GET_ALL),
    create: (data) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROXIES_CREATE, data),
    update: (id, data) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROXIES_UPDATE, id, data),
    delete: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.PROXIES_DELETE, id)
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
