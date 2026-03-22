import { BrowserWindow } from 'electron'
import { IPC_CHANNELS, type ProfileRuntimeState } from '../../shared/types'

export function broadcastProfileStatus(state: ProfileRuntimeState): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IPC_CHANNELS.STATUS_PROFILE_CHANGED, state)
  }
}

export function broadcastProfileError(profileId: string, message: string): void {
  broadcastProfileStatus({
    profileId,
    status: 'error',
    error: message
  })
}
