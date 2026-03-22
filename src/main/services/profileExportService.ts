import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { ProfileExportZipResult } from '../../shared/types'
import { ProfileRepository } from '../repositories/profileRepo'

type ArchiverFactory = (format: string, options?: { zlib?: { level?: number } }) => {
  on: (event: string, callback: (error: unknown) => void) => void
  pipe: (stream: NodeJS.WritableStream) => void
  directory: (source: string, destination: string) => void
  append: (input: string, data: { name: string }) => void
  finalize: () => Promise<void>
}

const archiver = require('archiver') as ArchiverFactory

const profileRepo = new ProfileRepository()

function ensureParentDir(filePath: string): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export async function exportProfileToZip(profileId: string, outputFilePath: string): Promise<ProfileExportZipResult> {
  const profile = profileRepo.getById(profileId)
  if (!profile) {
    return { success: false, error: `Profile not found: ${profileId}` }
  }

  const profileBaseDir = path.join(app.getPath('userData'), 'profiles', profileId)
  if (!fs.existsSync(profileBaseDir)) {
    return { success: false, error: `Profile directory not found: ${profileBaseDir}` }
  }

  ensureParentDir(outputFilePath)

  return new Promise((resolve) => {
    const output = fs.createWriteStream(outputFilePath)
    const archive = archiver('zip', { zlib: { level: 6 } })

    output.on('close', () => {
      resolve({ success: true, path: outputFilePath })
    })

    output.on('error', (error) => {
      const message = error instanceof Error ? error.message : String(error)
      resolve({ success: false, error: message })
    })

    archive.on('error', (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      resolve({ success: false, error: message })
    })

    archive.pipe(output)

    const userDataDir = path.join(profileBaseDir, 'user-data')
    const cookiesDir = path.join(profileBaseDir, 'cookies')

    if (fs.existsSync(userDataDir)) {
      archive.directory(userDataDir, 'user-data')
    }

    if (fs.existsSync(cookiesDir)) {
      archive.directory(cookiesDir, 'cookies')
    }

    archive.append(JSON.stringify(profile, null, 2), { name: 'profile.json' })
    void archive.finalize()
  })
}
