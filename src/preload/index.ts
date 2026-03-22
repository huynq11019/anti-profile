import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS, Profile, Proxy, ProfileRuntimeState, SysMetrics, UiAlert } from '../shared/types'

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
    importZip: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_IMPORT_ZIP),
    exportZip: (profileId: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_EXPORT_ZIP, profileId),
  },
  proxies: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.PROXIES_GET_ALL),
    create: (data: Partial<Proxy>) => ipcRenderer.invoke(IPC_CHANNELS.PROXIES_CREATE, data),
    update: (id: string, data: Partial<Proxy>) => ipcRenderer.invoke(IPC_CHANNELS.PROXIES_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROXIES_DELETE, id),
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
