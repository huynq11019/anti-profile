type FingerprintWebGlProfile = {
  vendor: string
  renderer: string
  angleBackend: 'default' | 'gl' | 'metal' | 'vulkan' | 'd3d11'
}

export type FingerprintProfile = {
  seed: number
  userAgent: string
  language: string
  webgl: FingerprintWebGlProfile
  canvasSalt: string
  windowSize: string
  deviceScaleFactor: string
  hardwareConcurrency: number
  brand: string
  brandVersion: string
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
]

const LANGUAGES = ['en-US,en;q=0.9', 'en-GB,en;q=0.9', 'vi-VN,vi;q=0.9,en-US;q=0.8']
const BRANDS = ['Chromium', 'Chrome', 'Edge', 'Opera', 'Vivaldi']

const WEBGL_PROFILES: FingerprintWebGlProfile[] = [
  {
    vendor: 'Google Inc. (NVIDIA)',
    renderer: 'ANGLE (NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)',
    angleBackend: 'd3d11'
  },
  {
    vendor: 'Google Inc. (Intel)',
    renderer: 'ANGLE (Intel, Intel(R) UHD Graphics OpenGL Engine, OpenGL 4.1)',
    angleBackend: 'gl'
  },
  {
    vendor: 'Google Inc. (Apple)',
    renderer: 'ANGLE (Apple M2, Apple M2, Metal)',
    angleBackend: 'metal'
  },
  {
    vendor: 'Google Inc. (AMD)',
    renderer: 'ANGLE (AMD Radeon RX 6700 XT Vulkan 1.3)',
    angleBackend: 'vulkan'
  }
]

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 123456
  const intSeed = Math.abs(Math.trunc(seed))
  return intSeed === 0 ? 123456 : intSeed
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(values: readonly T[], random: () => number): T {
  const index = Math.floor(random() * values.length)
  return values[index]
}

function randomHex(size: number, random: () => number): string {
  let output = ''
  for (let i = 0; i < size; i += 1) {
    output += Math.floor(random() * 16).toString(16)
  }
  return output
}

function normalizePlatform(platform: NodeJS.Platform): 'windows' | 'linux' | 'macos' {
  if (platform === 'win32') return 'windows'
  if (platform === 'darwin') return 'macos'
  return 'linux'
}

function normalizeLanguageHeader(value: string): string {
  return value.split(',').map((part) => part.trim()).filter(Boolean).join(',')
}

function primaryLanguage(value: string): string {
  return value.split(',')[0].trim() || 'en-US'
}

type FingerprintLaunchOptions = {
  customUserAgent?: string
  timezone?: string
  language?: string
  disableSpoofing?: Array<'font' | 'audio' | 'canvas' | 'clientrects' | 'gpu'>
  platform?: NodeJS.Platform
}

export function buildFingerprintProfile(seed: number): FingerprintProfile {
  const normalizedSeed = normalizeSeed(seed)
  const random = mulberry32(normalizedSeed)

  const width = pick([1366, 1440, 1536, 1680, 1728, 1920], random)
  const height = pick([768, 900, 960, 1024, 1080], random)

  return {
    seed: normalizedSeed,
    userAgent: pick(USER_AGENTS, random),
    language: pick(LANGUAGES, random),
    webgl: pick(WEBGL_PROFILES, random),
    canvasSalt: randomHex(16, random),
    windowSize: `${width},${height}`,
    deviceScaleFactor: pick(['1', '1.25', '1.5', '2'], random),
    hardwareConcurrency: pick([4, 6, 8, 10, 12, 16], random),
    brand: pick(BRANDS, random),
    brandVersion: pick(['120', '121', '122', '123', '124'], random)
  }
}

export function buildFingerprintLaunchArgs(seed: number, options: FingerprintLaunchOptions = {}): string[] {
  const profile = buildFingerprintProfile(seed)
  const platform = normalizePlatform(options.platform ?? process.platform)
  const acceptLanguage = normalizeLanguageHeader(options.language ?? profile.language)
  const language = primaryLanguage(acceptLanguage)
  const timezone = options.timezone?.trim() || 'UTC'
  const userAgent = options.customUserAgent?.trim() || profile.userAgent

  const spoofingArg = options.disableSpoofing?.length
    ? [`--disable-spoofing=${options.disableSpoofing.join(',')}`]
    : []

  return [
    `--fingerprint=${profile.seed}`,
    `--fingerprint-platform=${platform}`,
    `--fingerprint-brand=${profile.brand}`,
    `--fingerprint-brand-version=${profile.brandVersion}`,
    `--fingerprint-hardware-concurrency=${profile.hardwareConcurrency}`,
    '--disable-non-proxied-udp',
    `--lang=${language}`,
    `--accept-lang=${acceptLanguage}`,
    `--timezone=${timezone}`,
    ...spoofingArg,
    `--user-agent=${userAgent}`,
    `--window-size=${profile.windowSize}`,
    `--force-device-scale-factor=${profile.deviceScaleFactor}`,
    '--disable-blink-features=AutomationControlled'
  ]
}
