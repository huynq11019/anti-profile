import { Profile } from '@shared/types'

// ============================================================
// Stats
// ============================================================
export const DASHBOARD_STATS = [
  { label: 'Profiles', value: '128', icon: 'person_pin' },
  { label: 'Active', value: '36', icon: 'play_circle', isActive: true },
  { label: 'Proxies', value: '54', icon: 'vpn_lock' },
  { label: 'Automations', value: '8', icon: 'auto_mode' },
]

// ============================================================
// Sample profiles
// ============================================================
export const SAMPLE_PROFILES: Profile[] = [
  {
    id: 'p1',
    name: 'FB_Shop_Account_01',
    fingerprintSeed: 73461,
    isPinned: false,
    createdAt: '2026-01-01',
    lastOpened: '2 min ago',
    status: 'running',
    proxyId: 'proxy-us',
    tags: ['facebook'],
    timezone: 'America/New_York',
  },
  {
    id: 'p2',
    name: 'ShopeeVN_Seller_02',
    fingerprintSeed: 24812,
    isPinned: false,
    createdAt: '2026-01-02',
    lastOpened: '1 hour ago',
    status: 'idle',
    proxyId: 'proxy-vn',
    tags: ['shopee'],
    timezone: 'Asia/Ho_Chi_Minh',
  },
  {
    id: 'p3',
    name: 'Ads_Master_UK_01',
    fingerprintSeed: 98201,
    isPinned: false,
    createdAt: '2026-01-03',
    lastOpened: '4 hours ago',
    status: 'idle',
    proxyId: 'proxy-uk',
    tags: ['google-ads'],
    timezone: 'Europe/London',
  },
  {
    id: 'p4',
    name: 'Amazon_Review_Gen_04',
    fingerprintSeed: 11223,
    isPinned: false,
    createdAt: '2026-01-04',
    lastOpened: 'Just now',
    status: 'running',
    proxyId: 'proxy-de',
    tags: ['amazon'],
    timezone: 'Europe/Berlin',
  },
  {
    id: 'p5',
    name: 'Tiktok_Proxy_01',
    fingerprintSeed: 55678,
    isPinned: false,
    createdAt: '2026-01-05',
    lastOpened: 'Yesterday',
    status: 'idle',
    proxyId: 'proxy-br',
    tags: ['tiktok'],
    timezone: 'America/Sao_Paulo',
  },
  {
    id: 'p6',
    name: 'Etsy_Shop_Account_09',
    fingerprintSeed: 33091,
    isPinned: false,
    createdAt: '2026-01-06',
    lastOpened: '2 days ago',
    status: 'idle',
    proxyId: 'proxy-fr',
    tags: ['etsy'],
    timezone: 'Europe/Paris',
  },
]

// ============================================================
// Sidebar navigation items
// ============================================================
export const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'dashboard', path: '/' },
  { label: 'Profiles', icon: 'person_pin', path: '/profiles' },
  { label: 'Proxy Manager', icon: 'vpn_lock', path: '/proxy' },
  { label: 'Automation', icon: 'auto_mode', path: '/automation' },
  { label: 'Cookies', icon: 'cookie', path: '/cookies' },
  { label: 'Bookmarks', icon: 'bookmarks', path: '/bookmarks' },
  { label: 'Extensions', icon: 'extension', path: '/extensions' },
  { label: 'Settings', icon: 'settings', path: '/settings' },
]

// ============================================================
// Proxy country labels mapped by proxyId
// ============================================================
export const PROXY_MAP: Record<string, { country: string; ip: string }> = {
  'proxy-us': { country: 'US', ip: '45.234.12.111' },
  'proxy-vn': { country: 'VN', ip: '103.23.45.67' },
  'proxy-uk': { country: 'UK', ip: '82.165.34.12' },
  'proxy-de': { country: 'DE', ip: '52.12.99.101' },
  'proxy-br': { country: 'BR', ip: '177.34.21.19' },
  'proxy-fr': { country: 'FR', ip: '91.12.112.55' },
}

// ============================================================
// Fingerprint display helper
// ============================================================
export const formatFingerprint = (seed: number): string => {
  return seed.toString(16).padStart(8, '0').slice(0, 6) + '...' + seed.toString(16).slice(-2)
}
