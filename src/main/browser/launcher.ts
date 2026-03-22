import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { ensureChromiumBinary } from './browserManager'
import { ProfileRepository } from '../repositories/profileRepo'
import { ProxyRepository } from '../repositories/proxyRepo'
import { buildFingerprintLaunchArgs } from './fingerprintEngine'
import { closeProxyTunnel, createProxyTunnel } from './proxyServer'
import {
  getProfileProcess,
  removeProfileProcess,
  setProfileProcess
} from './processTracker'
import { broadcastProfileError, broadcastProfileStatus } from '../ipc/statusBroadcaster'
import type { Profile } from '../../shared/types'

type StartResult = { success: boolean; errors?: string[] }

const proxyRepository = new ProxyRepository()

function profileUserDataDir(profileId: string): string {
  const dir = path.join(app.getPath('userData'), 'profiles', profileId, 'user-data')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function buildChromiumArgs(profile: Profile, proxyServerUrl?: string): string[] {
  const userDataDir = profileUserDataDir(profile.id)
  const fingerprintArgs = buildFingerprintLaunchArgs(profile.fingerprintSeed, {
    customUserAgent: profile.userAgent,
    timezone: profile.timezone,
    language: profile.language,
    platform: process.platform
  })

  const args = [
    `--user-data-dir=${userDataDir}`,
    ...fingerprintArgs,
    '--no-first-run',
    '--no-default-browser-check',
    '--new-window',
    'about:blank'
  ]

  if (proxyServerUrl) {
    args.splice(1, 0, `--proxy-server=${proxyServerUrl}`)
  }

  return args
}

export async function launchProfiles(profileIds: string[], repo: ProfileRepository): Promise<StartResult> {
  const errors: string[] = []

  for (const profileId of profileIds) {
    const existing = getProfileProcess(profileId)
    if (existing && existing.exitCode === null && !existing.killed) {
      continue
    }

    broadcastProfileStatus({ profileId, status: 'idle' })

    const profile = repo.getById(profileId)
    if (!profile) {
      errors.push(`Profile not found: ${profileId}`)
      broadcastProfileError(profileId, `Profile not found: ${profileId}`)
      continue
    }

    try {
      let proxyServerUrl: string | undefined
      if (profile.proxyId) {
        const proxyConfig = proxyRepository.getById(profile.proxyId)
        if (!proxyConfig) {
          errors.push(`Proxy not found for profile ${profileId}: ${profile.proxyId}`)
          broadcastProfileError(profileId, `Proxy not found: ${profile.proxyId}`)
          continue
        }
        proxyServerUrl = await createProxyTunnel(profile.id, proxyConfig)
      }

      const chromium = await ensureChromiumBinary()
      const child = spawn(chromium.path, buildChromiumArgs(profile, proxyServerUrl), {
        detached: true,
        stdio: 'ignore'
      })

      child.unref()
      setProfileProcess(profile.id, child)
      broadcastProfileStatus({ profileId: profile.id, status: 'running' })
      child.once('exit', () => {
        removeProfileProcess(profile.id)
        broadcastProfileStatus({ profileId: profile.id, status: 'idle' })
        void closeProxyTunnel(profile.id)
      })

      repo.update(profile.id, { lastOpened: new Date().toISOString() })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`Failed to launch ${profileId}: ${message}`)
      broadcastProfileError(profileId, message)
    }
  }

  return errors.length > 0 ? { success: false, errors } : { success: true }
}

export async function stopProfiles(profileIds: string[]): Promise<StartResult> {
  const errors: string[] = []

  for (const profileId of profileIds) {
    const child = getProfileProcess(profileId)
    if (!child) {
      continue
    }

    const pid = child.pid
    if (!pid) {
      removeProfileProcess(profileId)
      broadcastProfileStatus({ profileId, status: 'idle' })
      continue
    }

    try {
      if (process.platform === 'win32') {
        process.kill(pid, 'SIGTERM')
      } else {
        process.kill(-pid, 'SIGTERM')
      }
      removeProfileProcess(profileId)
      broadcastProfileStatus({ profileId, status: 'idle' })
      await closeProxyTunnel(profileId)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`Failed to stop ${profileId}: ${message}`)
      broadcastProfileError(profileId, message)
    }
  }

  return errors.length > 0 ? { success: false, errors } : { success: true }
}
