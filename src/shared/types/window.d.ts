import type {
  Profile,
  ProfileRuntimeState,
  Proxy,
  SysMetrics,
  UiAlert,
  CookieFormat,
  CookieReadResult,
  CookieWriteResult,
  ProfileExportZipResult,
  BookmarkRecord,
  BookmarkWriteResult,
  ProfileExtensionRecord,
  ExtensionWriteResult
} from './index'
import type { Group } from './index'

declare global {
  interface Window {
    api: {
      profiles: {
        getAll: () => Promise<Profile[]>
        create: (data: Partial<Profile>) => Promise<Profile>
        update: (id: string, data: Partial<Profile>) => Promise<Profile>
        delete: (id: string) => Promise<void>
        start: (profilesIdList: string[]) => Promise<{ success: boolean; errors?: string[] }>
        stop: (profilesIdList: string[]) => Promise<{ success: boolean; errors?: string[] }>
        bulkUpdate: (profileIds: string[], updates: Partial<Profile>) => Promise<{ success: boolean; errors?: string[] }>
        bulkOpen: (profileIds: string[]) => Promise<{ success: boolean; errors?: string[] }>
        bulkClose: (profileIds: string[]) => Promise<{ success: boolean; errors?: string[] }>
        bulkAssignProxy: (profileIds: string[], proxyId?: string) => Promise<{ success: boolean; errors?: string[] }>
        bulkAssignProxyMap: (profileProxyMap: Record<string, string | undefined>) => Promise<{ success: boolean; errors?: string[] }>
        importZip: () => Promise<boolean>
        exportZip: (profileId: string) => Promise<ProfileExportZipResult>
        openFolder: (profileId: string) => Promise<{ success: boolean; error?: string }>
      }
      proxies: {
        getAll: () => Promise<Proxy[]>
        create: (data: Partial<Proxy>) => Promise<Proxy>
        update: (id: string, data: Partial<Proxy>) => Promise<Proxy>
        delete: (id: string) => Promise<void>
      }
      groups: {
        getAll: () => Promise<Group[]>
        create: (data: Partial<Group>) => Promise<Group>
        update: (id: string, data: Partial<Group>) => Promise<Group>
        delete: (id: string) => Promise<void>
      }
      cookies: {
        read: (profileId: string, format: CookieFormat) => Promise<CookieReadResult>
        write: (profileId: string, format: CookieFormat, content: string) => Promise<CookieWriteResult>
        clear: (profileId: string) => Promise<CookieWriteResult>
      }
      bookmarks: {
        list: (profileId: string) => Promise<BookmarkRecord[]>
        add: (profileId: string, bookmark: { title: string; url: string; folder?: string }) => Promise<BookmarkWriteResult>
        delete: (profileId: string, bookmarkId: string) => Promise<BookmarkWriteResult>
        importJson: (profileId: string, jsonContent: string) => Promise<BookmarkWriteResult>
      }
      extensions: {
        list: (profileId: string) => Promise<ProfileExtensionRecord[]>
        installUnpacked: (profileId: string, directoryPath: string) => Promise<ExtensionWriteResult>
        installCrx: (profileId: string, crxPath: string) => Promise<ExtensionWriteResult>
        installWebstore: (profileId: string, webstoreUrl: string) => Promise<ExtensionWriteResult>
        remove: (profileId: string, extensionId: string) => Promise<ExtensionWriteResult>
        toggle: (profileId: string, extensionId: string, enabled: boolean) => Promise<ExtensionWriteResult>
      }
      onProfileStatusChange: (callback: (state: ProfileRuntimeState) => void) => () => void
      onSysMetrics: (callback: (metrics: SysMetrics) => void) => () => void
      onUiAlert: (callback: (alert: UiAlert) => void) => () => void
    }
  }
}

export {}
