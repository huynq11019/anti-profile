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
  PROFILES_IMPORT_ZIP: 'profiles:importZip',
  PROFILES_EXPORT_ZIP: 'profiles:exportZip',
  
  PROXIES_GET_ALL: 'proxies:getAll',
  PROXIES_CREATE: 'proxies:create',
  PROXIES_UPDATE: 'proxies:update',
  PROXIES_DELETE: 'proxies:delete',
  
  STATUS_PROFILE_CHANGED: 'status:profileChanged',
  STATUS_SYS_METRICS: 'status:sysMetrics',
  UI_ALERTS: 'ui:alerts',
} as const
