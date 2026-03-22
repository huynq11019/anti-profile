import { app } from 'electron'
import fs from 'fs'
import https from 'https'
import path from 'path'
import { createHash } from 'crypto'
import { spawnSync } from 'child_process'

export interface EnsureChromiumOptions {
  downloadUrl?: string
  expectedSha256?: string
  forceDownload?: boolean
}

export interface ChromiumBinaryResult {
  path: string
  source: 'env' | 'local' | 'downloaded'
}

const EXECUTABLE_BY_PLATFORM: Partial<Record<NodeJS.Platform, string[]>> = {
  win32: ['chrome.exe', 'ungoogled-chromium.exe', 'chromium.exe'],
  darwin: [
    'Chromium.app/Contents/MacOS/Chromium',
    'Google Chrome.app/Contents/MacOS/Google Chrome',
    'Brave Browser.app/Contents/MacOS/Brave Browser',
    'chrome',
    'chromium'
  ],
  linux: ['chrome', 'chromium', 'ungoogled-chromium']
}

const FINGERPRINT_CHROMIUM_RELEASE = '144.0.7559.132'
const DEFAULT_RELEASE_DOWNLOAD_URL: Partial<Record<NodeJS.Platform, string>> = {
  win32: `https://github.com/adryfish/fingerprint-chromium/releases/download/${FINGERPRINT_CHROMIUM_RELEASE}/ungoogled-chromium_144.0.7559.132-1.1_windows_x64.zip`,
  linux: `https://github.com/adryfish/fingerprint-chromium/releases/download/${FINGERPRINT_CHROMIUM_RELEASE}/ungoogled-chromium-144.0.7559.132-1-x86_64_linux.tar.xz`
}

function getExecutableCandidates(): string[] {
  const platform = process.platform
  return EXECUTABLE_BY_PLATFORM[platform] ?? ['chrome', 'chromium']
}

function toRootPath(...parts: string[]): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, ...parts)
    : path.join(process.cwd(), ...parts)
}

function isExecutable(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false
  if (process.platform === 'win32') return true

  try {
    fs.accessSync(filePath, fs.constants.X_OK)
    return true
  } catch {
    return false
  }
}

function findExistingChromiumBinary(): ChromiumBinaryResult | null {
  const envPaths = [process.env.UNGOOGLED_CHROMIUM_PATH, process.env.CHROMIUM_PATH].filter(Boolean) as string[]
  for (const candidate of envPaths) {
    if (isExecutable(candidate)) {
      return { path: candidate, source: 'env' }
    }
  }

  const platformAbsoluteCandidates: Partial<Record<NodeJS.Platform, string[]>> = {
    darwin: [
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
    ]
  }

  for (const candidate of platformAbsoluteCandidates[process.platform] ?? []) {
    if (isExecutable(candidate)) {
      return { path: candidate, source: 'local' }
    }
  }

  const roots = [
    toRootPath('browser'),
    path.join(app.getPath('userData'), 'browser')
  ]

  const executables = getExecutableCandidates()
  for (const root of roots) {
    for (const executable of executables) {
      const candidate = path.join(root, executable)
      if (isExecutable(candidate)) {
        return { path: candidate, source: 'local' }
      }
    }
  }

  return null
}

function createDownloadDir(): string {
  const dir = path.join(app.getPath('userData'), 'browser')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function downloadFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const statusCode = response.statusCode ?? 0

      if ([301, 302, 307, 308].includes(statusCode)) {
        const redirect = response.headers.location
        response.resume()
        if (!redirect) {
          reject(new Error('Chromium download redirected without a location header.'))
          return
        }
        downloadFile(redirect, outputPath).then(resolve).catch(reject)
        return
      }

      if (statusCode < 200 || statusCode >= 300) {
        response.resume()
        reject(new Error(`Chromium download failed with HTTP status ${statusCode}.`))
        return
      }

      const fileStream = fs.createWriteStream(outputPath)
      response.pipe(fileStream)

      fileStream.on('finish', () => {
        fileStream.close()
        resolve()
      })

      fileStream.on('error', (error) => {
        fileStream.close()
        reject(error)
      })
    })

    request.on('error', reject)
  })
}

function calculateSha256(filePath: string): string {
  const hash = createHash('sha256')
  const fileBuffer = fs.readFileSync(filePath)
  hash.update(fileBuffer)
  return hash.digest('hex')
}

function ensureExecutableBit(filePath: string): void {
  if (process.platform !== 'win32') {
    fs.chmodSync(filePath, 0o755)
  }
}

function findBinaryRecursively(rootDir: string): string | null {
  const executables = getExecutableCandidates()

  const walk = (dirPath: string): string | null => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        const nested = walk(fullPath)
        if (nested) return nested
      }

      if (entry.isFile()) {
        if (executables.includes(entry.name) && isExecutable(fullPath)) {
          return fullPath
        }
      }
    }

    return null
  }

  return walk(rootDir)
}

function extractArchive(archivePath: string, outputDir: string): void {
  if (archivePath.endsWith('.zip')) {
    if (process.platform === 'win32') {
      const cmd = `Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${outputDir.replace(/'/g, "''")}' -Force`
      const result = spawnSync('powershell', ['-NoProfile', '-Command', cmd], { stdio: 'pipe' })
      if (result.status !== 0) {
        throw new Error(`Failed to extract Chromium zip: ${result.stderr.toString()}`)
      }
      return
    }

    const unzipResult = spawnSync('unzip', ['-o', archivePath, '-d', outputDir], { stdio: 'pipe' })
    if (unzipResult.status !== 0) {
      throw new Error(`Failed to extract Chromium zip: ${unzipResult.stderr.toString()}`)
    }
    return
  }

  if (archivePath.endsWith('.tar.xz')) {
    const tarResult = spawnSync('tar', ['-xJf', archivePath, '-C', outputDir], { stdio: 'pipe' })
    if (tarResult.status !== 0) {
      throw new Error(`Failed to extract Chromium tar.xz: ${tarResult.stderr.toString()}`)
    }
    return
  }

  throw new Error('Unsupported Chromium archive format. Use a direct binary URL, .zip, or .tar.xz archive URL.')
}

function defaultDownloadUrlForPlatform(): string | undefined {
  const fromEnv = (() => {
    switch (process.platform) {
      case 'win32':
        return process.env.UNGOOGLED_CHROMIUM_URL_WIN
      case 'darwin':
        return process.env.UNGOOGLED_CHROMIUM_URL_MAC
      case 'linux':
        return process.env.UNGOOGLED_CHROMIUM_URL_LINUX
      default:
        return undefined
    }
  })()

  if (fromEnv) return fromEnv

  switch (process.platform) {
    case 'win32':
    case 'linux':
      return DEFAULT_RELEASE_DOWNLOAD_URL[process.platform]
    default:
      return undefined
  }
}

async function downloadChromium(downloadUrl: string, expectedSha256?: string): Promise<string> {
  const downloadDir = createDownloadDir()
  const urlObject = new URL(downloadUrl)
  const fileName = path.basename(urlObject.pathname) || 'chromium-download'
  const downloadedPath = path.join(downloadDir, fileName)

  await downloadFile(downloadUrl, downloadedPath)

  if (expectedSha256) {
    const actual = calculateSha256(downloadedPath)
    if (actual.toLowerCase() !== expectedSha256.toLowerCase()) {
      throw new Error('SHA256 verification failed for downloaded Chromium binary.')
    }
  }

  if (downloadedPath.endsWith('.zip') || downloadedPath.endsWith('.tar.xz')) {
    const extractDir = path.join(downloadDir, 'extracted')
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true })
    }

    extractArchive(downloadedPath, extractDir)
    const extractedBinary = findBinaryRecursively(extractDir)
    if (!extractedBinary) {
      throw new Error('Unable to locate Chromium executable in extracted archive.')
    }
    ensureExecutableBit(extractedBinary)
    return extractedBinary
  }

  ensureExecutableBit(downloadedPath)
  return downloadedPath
}

export async function ensureChromiumBinary(options: EnsureChromiumOptions = {}): Promise<ChromiumBinaryResult> {
  if (!options.forceDownload) {
    const existing = findExistingChromiumBinary()
    if (existing) return existing
  }

  const downloadUrl = options.downloadUrl ?? process.env.UNGOOGLED_CHROMIUM_URL ?? defaultDownloadUrlForPlatform()
  if (!downloadUrl) {
    throw new Error(
      [
        'Chromium binary not found.',
        'Set UNGOOGLED_CHROMIUM_PATH/CHROMIUM_PATH or place binary in ./browser.',
        'On macOS, install Chromium/Google Chrome locally or define UNGOOGLED_CHROMIUM_URL_MAC.',
        'On Windows/Linux, auto-download defaults to adryfish/fingerprint-chromium 144.0.7559.132.',
        'You can override with UNGOOGLED_CHROMIUM_URL (or platform-specific URL env vars).'
      ].join(' ')
    )
  }

  const binaryPath = await downloadChromium(downloadUrl, options.expectedSha256)
  return { path: binaryPath, source: 'downloaded' }
}
