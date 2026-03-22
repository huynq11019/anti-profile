import { ipcMain } from 'electron'
import { IPC_CHANNELS, type ExtensionWriteResult } from '../../shared/types'
import {
  installExtensionFromCrx,
  installExtensionFromUnpacked,
  installExtensionFromWebstore,
  listProfileExtensions,
  removeProfileExtension,
  toggleProfileExtension
} from '../services/extensionService'

export function setupExtensionHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.EXTENSIONS_LIST, async (_event, profileId: string) => {
    return listProfileExtensions(profileId)
  })

  ipcMain.handle(IPC_CHANNELS.EXTENSIONS_INSTALL_UNPACKED, async (_event, profileId: string, directoryPath: string): Promise<ExtensionWriteResult> => {
    try {
      installExtensionFromUnpacked(profileId, directoryPath)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.EXTENSIONS_INSTALL_CRX, async (_event, profileId: string, crxPath: string): Promise<ExtensionWriteResult> => {
    try {
      installExtensionFromCrx(profileId, crxPath)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.EXTENSIONS_INSTALL_WEBSTORE, async (_event, profileId: string, webstoreUrl: string): Promise<ExtensionWriteResult> => {
    try {
      await installExtensionFromWebstore(profileId, webstoreUrl)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.EXTENSIONS_REMOVE, async (_event, profileId: string, extensionId: string): Promise<ExtensionWriteResult> => {
    try {
      removeProfileExtension(profileId, extensionId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.EXTENSIONS_TOGGLE, async (_event, profileId: string, extensionId: string, enabled: boolean): Promise<ExtensionWriteResult> => {
    try {
      toggleProfileExtension(profileId, extensionId, enabled)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, error: message }
    }
  })
}
