import { app, dialog, ipcMain } from 'electron'
import path from 'path'
import { IPC_CHANNELS } from '../../shared/types'
import { setupProfileHandlers } from './profileHandlers'
import { setupProxyHandlers } from './proxyHandlers'
import { setupGroupHandlers } from './groupHandlers'
import { setupBulkHandlers } from './bulkHandlers'
import { setupCookieHandlers } from './cookieHandlers'
import { setupBookmarkHandlers } from './bookmarkHandlers'
import { setupExtensionHandlers } from './extensionHandlers'
import { ProfileRepository } from '../repositories/profileRepo'
import { exportProfileToZip } from '../services/profileExportService'

const profileRepo = new ProfileRepository()

export function setupIpcHandlers() {
  setupProfileHandlers()
  setupProxyHandlers()
  setupGroupHandlers()
  setupBulkHandlers()
  setupCookieHandlers()
  setupBookmarkHandlers()
  setupExtensionHandlers()

  // ---------------------------------------------------------------------------
  // Profiles operations not implemented yet
  // ---------------------------------------------------------------------------

  ipcMain.handle(IPC_CHANNELS.PROFILES_IMPORT_ZIP, async () => {
    console.log('Stub: profiles:importZip')
    return false
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_EXPORT_ZIP, async (_event, profileId: string) => {
    const profile = profileRepo.getById(profileId)
    if (!profile) {
      return { success: false, error: `Profile not found: ${profileId}` }
    }

    const safeName = profile.name.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || profile.id
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const defaultPath = path.join(app.getPath('downloads'), `${safeName}_${timestamp}.zip`)

    const saveResult = await dialog.showSaveDialog({
      title: 'Export Profile to ZIP',
      defaultPath,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
    })

    if (saveResult.canceled || !saveResult.filePath) {
      return { success: false, error: 'Export canceled by user.' }
    }

    return exportProfileToZip(profileId, saveResult.filePath)
  })

}
