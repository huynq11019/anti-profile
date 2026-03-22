import type { Profile, ProfileRuntimeState, Proxy, SysMetrics, UiAlert } from './index'

declare global {
  interface Window {
    api: {
      profiles: {
        getAll: () => Promise<Profile[]>
        create: (data: Partial<Profile>) => Promise<Profile>
        update: (id: string, data: Partial<Profile>) => Promise<Profile>
        delete: (id: string) => Promise<void>
        start: (profilesIdList: string[]) => Promise<{ success: boolean; errors?: string[] }>
        stop: (profilesIdList: string[]) => Promise<void>
        bulkUpdate: (profileIds: string[], updates: Partial<Profile>) => Promise<void>
        importZip: () => Promise<boolean>
        exportZip: (profileId: string) => Promise<void>
      }
      proxies: {
        getAll: () => Promise<Proxy[]>
        create: (data: Partial<Proxy>) => Promise<Proxy>
        update: (id: string, data: Partial<Proxy>) => Promise<Proxy>
        delete: (id: string) => Promise<void>
      }
      onProfileStatusChange: (callback: (state: ProfileRuntimeState) => void) => () => void
      onSysMetrics: (callback: (metrics: SysMetrics) => void) => () => void
      onUiAlert: (callback: (alert: UiAlert) => void) => () => void
    }
  }
}

export {}
