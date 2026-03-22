import { ipcMain } from 'electron'
import { IPC_CHANNELS, type Profile } from '../../shared/types'
import { ProfileRepository } from '../repositories/profileRepo'
import { launchProfiles, stopProfiles } from '../browser/launcher'

const profileRepo = new ProfileRepository()

export function setupProfileHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.PROFILES_GET_ALL, async () => {
    return profileRepo.list()
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_CREATE, async (_event, data: Partial<Profile>) => {
    return profileRepo.create(data)
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_UPDATE, async (_event, id: string, data: Partial<Profile>) => {
    return profileRepo.update(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_DELETE, async (_event, id: string) => {
    profileRepo.delete(id)
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_START, async (_event, profileIds: string[]) => {
    return launchProfiles(profileIds, profileRepo)
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_STOP, async (_event, profileIds: string[]) => {
    return stopProfiles(profileIds)
  })
}
