// Profile entity
export interface Profile {
  id: string
  name: string
  groupId?: string
  note?: string
  proxyId?: string
  fingerprintSeed: number
  userAgent?: string
  timezone?: string
  language?: string
  tags?: string[]
  isPinned: boolean
  lastOpened?: string
  createdAt: string
  status: 'idle' | 'running' | 'error'
}

export interface ProfileRuntimeState {
  profileId: string
  status: 'idle' | 'running' | 'error'
  error?: string
}

export interface SysMetrics {
  cpuUsage: number
  ramUsage: number
  totalRam: number
}

export interface UiAlert {
  level: 'info' | 'warning' | 'error'
  text: string
}

export type CookieFormat = 'json' | 'netscape'

export interface CookieRecord {
  domain: string
  name: string
  value: string
  path: string
  expires: number
  secure: boolean
  httpOnly: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

export interface CookieReadResult {
  success: boolean
  format: CookieFormat
  cookies: CookieRecord[]
  content: string
  error?: string
}

export interface CookieWriteResult {
  success: boolean
  count: number
  error?: string
}

export interface ProfileExportZipResult {
  success: boolean
  path?: string
  error?: string
}

export interface BookmarkRecord {
  id: string
  profileId: string
  title: string
  url: string
  folder?: string
  createdAt: string
}

export interface BookmarkWriteResult {
  success: boolean
  count: number
  error?: string
}

export interface ProfileExtensionRecord {
  id: string
  profileId: string
  extensionName: string
  extensionPath: string
  source: 'unpacked' | 'crx' | 'webstore'
  sourceRef?: string
  enabled: boolean
  createdAt: string
}

export interface ExtensionWriteResult {
  success: boolean
  error?: string
}

// Proxy entity
export interface Proxy {
  id: string
  alias: string
  protocol: 'http' | 'socks5'
  host: string
  port: number
  username?: string
  password?: string
  lastTested?: string
  testStatus?: 'active' | 'failed' | 'unknown'
}

// Group entity
export interface Group {
  id: string
  name: string
  color?: string
}

// IPC channels
export const IPC_CHANNELS = {
  PROFILES_GET_ALL: 'profiles:getAll',
  PROFILES_CREATE: 'profiles:create',
  PROFILES_UPDATE: 'profiles:update',
  PROFILES_DELETE: 'profiles:delete',
  PROFILES_START: 'profiles:start',
  PROFILES_STOP: 'profiles:stop',
  PROFILES_BULK_UPDATE: 'profiles:bulkUpdate',
  PROFILES_BULK_OPEN: 'profiles:bulkOpen',
  PROFILES_BULK_CLOSE: 'profiles:bulkClose',
  PROFILES_BULK_PROXY_ASSIGN: 'profiles:bulkProxyAssign',
  PROFILES_BULK_PROXY_ASSIGN_MAP: 'profiles:bulkProxyAssignMap',
  PROFILES_IMPORT_ZIP: 'profiles:importZip',
  PROFILES_EXPORT_ZIP: 'profiles:exportZip',
  PROFILES_OPEN_FOLDER: 'profiles:openFolder',

  COOKIES_READ: 'cookies:read',
  COOKIES_WRITE: 'cookies:write',
  COOKIES_CLEAR: 'cookies:clear',

  BOOKMARKS_LIST: 'bookmarks:list',
  BOOKMARKS_ADD: 'bookmarks:add',
  BOOKMARKS_DELETE: 'bookmarks:delete',
  BOOKMARKS_IMPORT_JSON: 'bookmarks:importJson',

  EXTENSIONS_LIST: 'extensions:list',
  EXTENSIONS_INSTALL_UNPACKED: 'extensions:installUnpacked',
  EXTENSIONS_INSTALL_CRX: 'extensions:installCrx',
  EXTENSIONS_INSTALL_WEBSTORE: 'extensions:installWebstore',
  EXTENSIONS_REMOVE: 'extensions:remove',
  EXTENSIONS_TOGGLE: 'extensions:toggle',
  
  PROXIES_GET_ALL: 'proxies:getAll',
  PROXIES_CREATE: 'proxies:create',
  PROXIES_UPDATE: 'proxies:update',
  PROXIES_DELETE: 'proxies:delete',

  GROUPS_GET_ALL: 'groups:getAll',
  GROUPS_CREATE: 'groups:create',
  GROUPS_UPDATE: 'groups:update',
  GROUPS_DELETE: 'groups:delete',
  
  STATUS_PROFILE_CHANGED: 'status:profileChanged',
  STATUS_SYS_METRICS: 'status:sysMetrics',
  UI_ALERTS: 'ui:alerts',
} as const
