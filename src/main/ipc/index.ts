import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import { setupProfileHandlers } from './profileHandlers'
import { setupProxyHandlers } from './proxyHandlers'
import { setupGroupHandlers } from './groupHandlers'
import { setupBulkHandlers } from './bulkHandlers'
import { setupCookieHandlers } from './cookieHandlers'

export function setupIpcHandlers() {
  setupProfileHandlers()
  setupProxyHandlers()
  setupGroupHandlers()
  setupBulkHandlers()
  setupCookieHandlers()

  // ---------------------------------------------------------------------------
  // Profiles operations not implemented yet
  // ---------------------------------------------------------------------------

  ipcMain.handle(IPC_CHANNELS.PROFILES_IMPORT_ZIP, async () => {
    console.log('Stub: profiles:importZip')
    return false
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_EXPORT_ZIP, async (_event, profileId) => {
    console.log('Stub: profiles:exportZip', profileId)
  })

}
