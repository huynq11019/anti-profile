import { app, ipcMain, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import { IPC_CHANNELS, type Profile } from '../../shared/types'
import { ProfileRepository } from '../repositories/profileRepo'
import { launchProfiles, stopProfiles } from '../browser/launcher'

const profileRepo = new ProfileRepository()

function safeReadJson(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return {}
  } catch {
    return {}
  }
}

function writeJson(filePath: string, payload: Record<string, unknown>): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8')
}

function syncBrowserProfileName(profileId: string, profileName: string): void {
  const userDataDir = path.join(app.getPath('userData'), 'profiles', profileId, 'user-data')
  const localStatePath = path.join(userDataDir, 'Local State')
  const preferencesPath = path.join(userDataDir, 'Default', 'Preferences')

  const localState = safeReadJson(localStatePath)
  const profileObject =
    localState.profile && typeof localState.profile === 'object' && !Array.isArray(localState.profile)
      ? (localState.profile as Record<string, unknown>)
      : {}
  const infoCache =
    profileObject.info_cache && typeof profileObject.info_cache === 'object' && !Array.isArray(profileObject.info_cache)
      ? (profileObject.info_cache as Record<string, unknown>)
      : {}
  const defaultInfo =
    infoCache.Default && typeof infoCache.Default === 'object' && !Array.isArray(infoCache.Default)
      ? (infoCache.Default as Record<string, unknown>)
      : {}

  defaultInfo.name = profileName
  infoCache.Default = defaultInfo
  profileObject.info_cache = infoCache
  localState.profile = profileObject
  writeJson(localStatePath, localState)

  const preferences = safeReadJson(preferencesPath)
  const preferencesProfile =
    preferences.profile && typeof preferences.profile === 'object' && !Array.isArray(preferences.profile)
      ? (preferences.profile as Record<string, unknown>)
      : {}
  preferencesProfile.name = profileName
  preferences.profile = preferencesProfile
  writeJson(preferencesPath, preferences)
}

export function setupProfileHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.PROFILES_GET_ALL, async () => {
    return profileRepo.list()
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_CREATE, async (_event, data: Partial<Profile>) => {
    return profileRepo.create(data)
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_UPDATE, async (_event, id: string, data: Partial<Profile>) => {
    const updated = profileRepo.update(id, data)

    if (typeof data.name === 'string' && data.name.trim()) {
      syncBrowserProfileName(id, data.name.trim())
    }

    return updated
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

  ipcMain.handle(IPC_CHANNELS.PROFILES_OPEN_FOLDER, async (_event, profileId: string) => {
    const profile = profileRepo.getById(profileId)
    if (!profile) {
      return { success: false, error: `Profile not found: ${profileId}` }
    }

    const folderPath = path.join(app.getPath('userData'), 'profiles', profileId)
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true })
    }

    const openError = await shell.openPath(folderPath)
    if (openError) {
      return { success: false, error: openError }
    }

    return { success: true }
  })
}
