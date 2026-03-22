import { app } from 'electron'
import fs from 'fs'
import https from 'https'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { ProfileRepository } from '../repositories/profileRepo'
import { ExtensionRepository } from '../repositories/extensionRepo'
import { hasRunningProfileProcess } from '../browser/processTracker'

const AdmZip = require('adm-zip') as {
  new (input?: Buffer | string): {
    extractAllTo: (targetPath: string, overwrite?: boolean) => void
  }
}

const profileRepo = new ProfileRepository()
const extensionRepo = new ExtensionRepository()

function ensureProfile(profileId: string): void {
  const profile = profileRepo.getById(profileId)
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`)
  }
}

function ensureNotRunning(profileId: string): void {
  if (hasRunningProfileProcess(profileId)) {
    throw new Error('Profile is currently running. Please stop it before changing extensions.')
  }
}

function extensionBaseDir(profileId: string): string {
  const dir = path.join(app.getPath('userData'), 'profiles', profileId, 'extensions')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || randomUUID()
}

function parseWebstoreExtensionId(url: string): string | null {
  const match = url.match(/\/detail\/[a-zA-Z0-9-_]+\/([a-p]{32})/)
  return match?.[1] ?? null
}

function downloadFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath)

    const request = https.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        output.close()
        fs.unlinkSync(outputPath)
        void downloadFile(response.headers.location, outputPath).then(resolve).catch(reject)
        return
      }

      if (!response.statusCode || response.statusCode >= 400) {
        reject(new Error(`Failed to download file: HTTP ${response.statusCode ?? 'unknown'}`))
        return
      }

      response.pipe(output)
      output.on('finish', () => {
        output.close()
        resolve()
      })
    })

    request.on('error', (error) => {
      output.close()
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath)
      }
      reject(error)
    })
  })
}

function extractCrxToDirectory(crxPath: string, targetDir: string): void {
  const buffer = fs.readFileSync(crxPath)
  const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04])
  const zipOffset = buffer.indexOf(zipHeader)
  if (zipOffset < 0) {
    throw new Error('Invalid CRX file: ZIP payload not found.')
  }

  const zipBuffer = buffer.subarray(zipOffset)
  const zip = new AdmZip(zipBuffer)
  zip.extractAllTo(targetDir, true)
}

function resolveExtensionName(unpackedDir: string): string {
  const manifestPath = path.join(unpackedDir, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    return path.basename(unpackedDir)
  }

  try {
    const raw = fs.readFileSync(manifestPath, 'utf8')
    const parsed = JSON.parse(raw) as { name?: string }
    return parsed.name?.trim() || path.basename(unpackedDir)
  } catch {
    return path.basename(unpackedDir)
  }
}

export function listProfileExtensions(profileId: string) {
  ensureProfile(profileId)
  return extensionRepo.list(profileId)
}

export function listEnabledExtensionPaths(profileId: string): string[] {
  return extensionRepo
    .listEnabled(profileId)
    .map((record) => record.extensionPath)
    .filter((extensionPath) => fs.existsSync(extensionPath))
}

export function installExtensionFromUnpacked(profileId: string, directoryPath: string): void {
  ensureProfile(profileId)
  ensureNotRunning(profileId)

  const sourceDir = directoryPath.trim()
  if (!sourceDir || !fs.existsSync(sourceDir)) {
    throw new Error('Unpacked extension directory does not exist.')
  }

  const name = resolveExtensionName(sourceDir)
  const targetDir = path.join(extensionBaseDir(profileId), `${sanitizeName(name)}_${Date.now()}`)
  fs.cpSync(sourceDir, targetDir, { recursive: true })

  extensionRepo.add(profileId, {
    extensionName: name,
    extensionPath: targetDir,
    source: 'unpacked',
    sourceRef: sourceDir
  })
}

export function installExtensionFromCrx(profileId: string, crxPath: string): void {
  ensureProfile(profileId)
  ensureNotRunning(profileId)

  const sourceCrxPath = crxPath.trim()
  if (!sourceCrxPath || !fs.existsSync(sourceCrxPath)) {
    throw new Error('CRX file does not exist.')
  }

  const extensionName = sanitizeName(path.basename(sourceCrxPath, path.extname(sourceCrxPath)))
  const targetDir = path.join(extensionBaseDir(profileId), `${extensionName}_${Date.now()}`)
  fs.mkdirSync(targetDir, { recursive: true })
  extractCrxToDirectory(sourceCrxPath, targetDir)

  const resolvedName = resolveExtensionName(targetDir)
  extensionRepo.add(profileId, {
    extensionName: resolvedName,
    extensionPath: targetDir,
    source: 'crx',
    sourceRef: sourceCrxPath
  })
}

export async function installExtensionFromWebstore(profileId: string, webstoreUrl: string): Promise<void> {
  ensureProfile(profileId)
  ensureNotRunning(profileId)

  const extensionId = parseWebstoreExtensionId(webstoreUrl.trim())
  if (!extensionId) {
    throw new Error('Invalid Chrome Web Store URL. Cannot extract extension id.')
  }

  const downloadUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=122.0.0.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`
  const tmpCrxPath = path.join(os.tmpdir(), `${extensionId}_${Date.now()}.crx`)

  try {
    await downloadFile(downloadUrl, tmpCrxPath)

    const targetDir = path.join(extensionBaseDir(profileId), `${extensionId}_${Date.now()}`)
    fs.mkdirSync(targetDir, { recursive: true })
    extractCrxToDirectory(tmpCrxPath, targetDir)

    const extensionName = resolveExtensionName(targetDir)
    extensionRepo.add(profileId, {
      extensionName,
      extensionPath: targetDir,
      source: 'webstore',
      sourceRef: webstoreUrl.trim()
    })
  } finally {
    if (fs.existsSync(tmpCrxPath)) {
      fs.unlinkSync(tmpCrxPath)
    }
  }
}

export function removeProfileExtension(profileId: string, extensionId: string): void {
  ensureProfile(profileId)
  ensureNotRunning(profileId)

  const existing = extensionRepo.list(profileId).find((item) => item.id === extensionId)
  if (!existing) {
    throw new Error('Extension not found.')
  }

  extensionRepo.delete(profileId, extensionId)
  if (fs.existsSync(existing.extensionPath)) {
    fs.rmSync(existing.extensionPath, { recursive: true, force: true })
  }
}

export function toggleProfileExtension(profileId: string, extensionId: string, enabled: boolean): void {
  ensureProfile(profileId)
  ensureNotRunning(profileId)
  extensionRepo.toggle(profileId, extensionId, enabled)
}
