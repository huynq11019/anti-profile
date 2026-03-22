import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {
  IPC_CHANNELS,
  Profile,
  Proxy,
  Group,
  ProfileRuntimeState,
  SysMetrics,
  UiAlert,
  CookieFormat,
  CookieReadResult,
  CookieWriteResult,
  ProfileExportZipResult,
  BookmarkRecord,
  BookmarkWriteResult,
  ProfileExtensionRecord,
  ExtensionWriteResult
} from '../shared/types'

// Custom APIs for renderer
const api = {
  profiles: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_GET_ALL),
    create: (data: Partial<Profile>) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_CREATE, data),
    update: (id: string, data: Partial<Profile>) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_DELETE, id),
    start: (profilesIdList: string[]) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_START, profilesIdList),
    stop: (profilesIdList: string[]) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_STOP, profilesIdList),
    bulkUpdate: (profileIds: string[], updates: Partial<Profile>) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_BULK_UPDATE, profileIds, updates),
    bulkOpen: (profileIds: string[]) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_BULK_OPEN, profileIds),
    bulkClose: (profileIds: string[]) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_BULK_CLOSE, profileIds),
    bulkAssignProxy: (profileIds: string[], proxyId?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROFILES_BULK_PROXY_ASSIGN, profileIds, proxyId),
    bulkAssignProxyMap: (profileProxyMap: Record<string, string | undefined>) =>
      ipcRenderer.invoke(IPC_CHANNELS.PROFILES_BULK_PROXY_ASSIGN_MAP, profileProxyMap),
    importZip: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_IMPORT_ZIP),
    exportZip: (profileId: string): Promise<ProfileExportZipResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROFILES_EXPORT_ZIP, profileId),
    openFolder: (profileId: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_OPEN_FOLDER, profileId),
  },
  proxies: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.PROXIES_GET_ALL),
    create: (data: Partial<Proxy>) => ipcRenderer.invoke(IPC_CHANNELS.PROXIES_CREATE, data),
    update: (id: string, data: Partial<Proxy>) => ipcRenderer.invoke(IPC_CHANNELS.PROXIES_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROXIES_DELETE, id),
  },
  groups: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.GROUPS_GET_ALL),
    create: (data: Partial<Group>) => ipcRenderer.invoke(IPC_CHANNELS.GROUPS_CREATE, data),
    update: (id: string, data: Partial<Group>) => ipcRenderer.invoke(IPC_CHANNELS.GROUPS_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.GROUPS_DELETE, id),
  },
  cookies: {
    read: (profileId: string, format: CookieFormat): Promise<CookieReadResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.COOKIES_READ, profileId, format),
    write: (profileId: string, format: CookieFormat, content: string): Promise<CookieWriteResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.COOKIES_WRITE, profileId, format, content),
    clear: (profileId: string): Promise<CookieWriteResult> => ipcRenderer.invoke(IPC_CHANNELS.COOKIES_CLEAR, profileId)
  },
  bookmarks: {
    list: (profileId: string): Promise<BookmarkRecord[]> => ipcRenderer.invoke(IPC_CHANNELS.BOOKMARKS_LIST, profileId),
    add: (profileId: string, bookmark: { title: string; url: string; folder?: string }): Promise<BookmarkWriteResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.BOOKMARKS_ADD, profileId, bookmark),
    delete: (profileId: string, bookmarkId: string): Promise<BookmarkWriteResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.BOOKMARKS_DELETE, profileId, bookmarkId),
    importJson: (profileId: string, jsonContent: string): Promise<BookmarkWriteResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.BOOKMARKS_IMPORT_JSON, profileId, jsonContent)
  },
  extensions: {
    list: (profileId: string): Promise<ProfileExtensionRecord[]> => ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_LIST, profileId),
    installUnpacked: (profileId: string, directoryPath: string): Promise<ExtensionWriteResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_INSTALL_UNPACKED, profileId, directoryPath),
    installCrx: (profileId: string, crxPath: string): Promise<ExtensionWriteResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_INSTALL_CRX, profileId, crxPath),
    installWebstore: (profileId: string, webstoreUrl: string): Promise<ExtensionWriteResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_INSTALL_WEBSTORE, profileId, webstoreUrl),
    remove: (profileId: string, extensionId: string): Promise<ExtensionWriteResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_REMOVE, profileId, extensionId),
    toggle: (profileId: string, extensionId: string, enabled: boolean): Promise<ExtensionWriteResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_TOGGLE, profileId, extensionId, enabled)
  },
  onProfileStatusChange: (callback: (state: ProfileRuntimeState) => void) => {
    const handler = (_event: any, state: ProfileRuntimeState) => callback(state)
    ipcRenderer.on(IPC_CHANNELS.STATUS_PROFILE_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.STATUS_PROFILE_CHANGED, handler)
  },
  onSysMetrics: (callback: (metrics: SysMetrics) => void) => {
    const handler = (_event: any, metrics: SysMetrics) => callback(metrics)
    ipcRenderer.on(IPC_CHANNELS.STATUS_SYS_METRICS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.STATUS_SYS_METRICS, handler)
  },
  onUiAlert: (callback: (alert: UiAlert) => void) => {
    const handler = (_event: any, alert: UiAlert) => callback(alert)
    ipcRenderer.on(IPC_CHANNELS.UI_ALERTS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UI_ALERTS, handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (for dev/testing only)
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
