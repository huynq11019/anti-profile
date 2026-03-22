import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'

export function setupIpcHandlers() {
  // ---------------------------------------------------------------------------
  // Profiles CRUD
  // To be fully implemented in T010
  // ---------------------------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.PROFILES_GET_ALL, async () => {
    console.log('Stub: profiles:getAll')
    return []
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_CREATE, async (_event, data) => {
    console.log('Stub: profiles:create', data)
    return null
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_UPDATE, async (_event, id, data) => {
    console.log('Stub: profiles:update', id, data)
    return null
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_DELETE, async (_event, id) => {
    console.log('Stub: profiles:delete', id)
  })

  // ---------------------------------------------------------------------------
  // Profiles Operations
  // To be implemented in subsequent user stories
  // ---------------------------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.PROFILES_START, async (_event, profilesIdList) => {
    console.log('Stub: profiles:start', profilesIdList)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_STOP, async (_event, profilesIdList) => {
    console.log('Stub: profiles:stop', profilesIdList)
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_BULK_UPDATE, async (_event, profileIds, updates) => {
    console.log('Stub: profiles:bulkUpdate', profileIds, updates)
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_IMPORT_ZIP, async () => {
    console.log('Stub: profiles:importZip')
    return false
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_EXPORT_ZIP, async (_event, profileId) => {
    console.log('Stub: profiles:exportZip', profileId)
  })

  // ---------------------------------------------------------------------------
  // Proxies
  // To be implemented in T019
  // ---------------------------------------------------------------------------
  ipcMain.handle(IPC_CHANNELS.PROXIES_GET_ALL, async () => {
    console.log('Stub: proxies:getAll')
    return []
  })

  ipcMain.handle(IPC_CHANNELS.PROXIES_CREATE, async (_event, data) => {
    console.log('Stub: proxies:create', data)
    return null
  })

  ipcMain.handle(IPC_CHANNELS.PROXIES_UPDATE, async (_event, id, data) => {
    console.log('Stub: proxies:update', id, data)
    return null
  })

  ipcMain.handle(IPC_CHANNELS.PROXIES_DELETE, async (_event, id) => {
    console.log('Stub: proxies:delete', id)
  })
}
