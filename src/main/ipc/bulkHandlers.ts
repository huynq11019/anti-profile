import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import { ProfileRepository } from '../repositories/profileRepo'
import { launchProfiles, stopProfiles } from '../browser/launcher'
import { runWithConcurrency } from '../browser/queueManager'

const profileRepo = new ProfileRepository()

type BulkResult = {
  success: boolean
  errors?: string[]
}

async function bulkOpen(profileIds: string[]): Promise<BulkResult> {
  const results = await runWithConcurrency(
    profileIds,
    async (profileId) => {
      const openResult = await launchProfiles([profileId], profileRepo)
      if (!openResult.success) {
        throw new Error(openResult.errors?.join(', ') ?? `Failed to launch ${profileId}`)
      }
    },
    3
  )

  const errors = results
    .filter((result) => !result.success)
    .map((result) => `${result.item}: ${result.error ?? 'Unknown error'}`)

  return errors.length > 0 ? { success: false, errors } : { success: true }
}

async function bulkClose(profileIds: string[]): Promise<BulkResult> {
  return stopProfiles(profileIds)
}

async function bulkAssignProxy(profileIds: string[], proxyId?: string): Promise<BulkResult> {
  const errors: string[] = []

  for (const profileId of profileIds) {
    try {
      profileRepo.update(profileId, { proxyId })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${profileId}: ${message}`)
    }
  }

  return errors.length > 0 ? { success: false, errors } : { success: true }
}

async function bulkAssignProxyMap(profileProxyMap: Record<string, string | undefined>): Promise<BulkResult> {
  const errors: string[] = []

  for (const [profileId, proxyId] of Object.entries(profileProxyMap)) {
    try {
      profileRepo.update(profileId, { proxyId })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${profileId}: ${message}`)
    }
  }

  return errors.length > 0 ? { success: false, errors } : { success: true }
}

export function setupBulkHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.PROFILES_BULK_OPEN, async (_event, profileIds: string[]) => {
    return bulkOpen(profileIds)
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_BULK_CLOSE, async (_event, profileIds: string[]) => {
    return bulkClose(profileIds)
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_BULK_PROXY_ASSIGN, async (_event, profileIds: string[], proxyId?: string) => {
    return bulkAssignProxy(profileIds, proxyId)
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_BULK_PROXY_ASSIGN_MAP, async (_event, profileProxyMap: Record<string, string | undefined>) => {
    return bulkAssignProxyMap(profileProxyMap)
  })

  ipcMain.handle(IPC_CHANNELS.PROFILES_BULK_UPDATE, async (_event, profileIds: string[], updates: { proxyId?: string }) => {
    if (Object.prototype.hasOwnProperty.call(updates, 'proxyId')) {
      return bulkAssignProxy(profileIds, updates.proxyId)
    }

    return { success: true }
  })
}
