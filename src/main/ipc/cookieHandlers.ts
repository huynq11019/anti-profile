import { app, ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import {
  IPC_CHANNELS,
  type CookieFormat,
  type CookieReadResult,
  type CookieRecord,
  type CookieWriteResult
} from '../../shared/types'
import { ProfileRepository } from '../repositories/profileRepo'

const profileRepo = new ProfileRepository()
const CHROMIUM_UNIX_EPOCH_OFFSET_SECONDS = 11_644_473_600

type ChromiumCookieRow = {
  host_key: string
  name: string
  value: string
  path: string
  expires_utc: number | null
  is_secure: number
  is_httponly: number
  samesite: number | null
}

function getCookieFilePath(profileId: string, format: CookieFormat): string {
  const cookieDir = path.join(app.getPath('userData'), 'profiles', profileId, 'cookies')
  if (!fs.existsSync(cookieDir)) {
    fs.mkdirSync(cookieDir, { recursive: true })
  }

  const fileName = format === 'json' ? 'cookies.json' : 'cookies.txt'
  return path.join(cookieDir, fileName)
}

function getProfileUserDataDir(profileId: string): string {
  return path.join(app.getPath('userData'), 'profiles', profileId, 'user-data')
}

function getChromiumCookieDbPath(profileId: string): string {
  const userDataDir = getProfileUserDataDir(profileId)
  const candidates = [
    path.join(userDataDir, 'Default', 'Network', 'Cookies'),
    path.join(userDataDir, 'Default', 'Cookies')
  ]

  const existing = candidates.find((candidate) => fs.existsSync(candidate))
  return existing ?? candidates[0]
}

function toChromiumTimestamp(unixSeconds: number): number {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return 0
  }

  return Math.trunc((unixSeconds + CHROMIUM_UNIX_EPOCH_OFFSET_SECONDS) * 1_000_000)
}

function fromChromiumTimestamp(chromiumMicroseconds: number | null): number {
  if (!chromiumMicroseconds || !Number.isFinite(chromiumMicroseconds) || chromiumMicroseconds <= 0) {
    return 0
  }

  return Math.max(0, Math.trunc(chromiumMicroseconds / 1_000_000 - CHROMIUM_UNIX_EPOCH_OFFSET_SECONDS))
}

function toChromiumSameSite(sameSite: CookieRecord['sameSite']): number {
  if (sameSite === 'None') return 1
  if (sameSite === 'Lax') return 2
  if (sameSite === 'Strict') return 3
  return 0
}

function fromChromiumSameSite(sameSite: number | null): CookieRecord['sameSite'] {
  if (sameSite === 1) return 'None'
  if (sameSite === 2) return 'Lax'
  if (sameSite === 3) return 'Strict'
  return undefined
}

function withCookieDb<T>(profileId: string, run: (db: Database.Database) => T): T | null {
  const dbPath = getChromiumCookieDbPath(profileId)
  if (!fs.existsSync(dbPath)) {
    return null
  }

  const db = new Database(dbPath)
  try {
    return run(db)
  } finally {
    db.close()
  }
}

function getCookiesTableColumns(db: Database.Database): Set<string> {
  const rows = db.prepare('PRAGMA table_info(cookies)').all() as Array<{ name: string }>
  return new Set(rows.map((row) => row.name))
}

function readCookiesFromChromiumDb(profileId: string): CookieRecord[] | null {
  return withCookieDb(profileId, (db) => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'cookies'")
      .all() as Array<{ name: string }>

    if (tables.length === 0) {
      return []
    }

    const rows = db
      .prepare(
        `
          SELECT host_key, name, value, path, expires_utc, is_secure, is_httponly, samesite
          FROM cookies
          ORDER BY host_key ASC, name ASC
        `
      )
      .all() as ChromiumCookieRow[]

    return rows
      .map((row) =>
        normalizeCookie({
          domain: row.host_key,
          name: row.name,
          value: row.value ?? '',
          path: row.path ?? '/',
          expires: fromChromiumTimestamp(row.expires_utc),
          secure: Boolean(row.is_secure),
          httpOnly: Boolean(row.is_httponly),
          sameSite: fromChromiumSameSite(row.samesite)
        })
      )
      .filter((cookie) => cookie.domain && cookie.name)
  })
}

function writeCookiesToChromiumDb(profileId: string, cookies: CookieRecord[]): boolean {
  const result = withCookieDb(profileId, (db) => {
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'cookies'")
      .get() as { name: string } | undefined

    if (!tableExists) {
      return false
    }

    const columns = getCookiesTableColumns(db)
    const nowChromium = toChromiumTimestamp(Math.trunc(Date.now() / 1000))

    const apply = db.transaction((items: CookieRecord[]) => {
      const deleteStatement = db.prepare('DELETE FROM cookies WHERE host_key = ? AND name = ? AND path = ?')

      for (const cookie of items) {
        deleteStatement.run(cookie.domain, cookie.name, cookie.path || '/')

        const valuesByColumn: Record<string, unknown> = {
          creation_utc: nowChromium,
          host_key: cookie.domain,
          name: cookie.name,
          value: cookie.value,
          path: cookie.path || '/',
          expires_utc: toChromiumTimestamp(cookie.expires),
          is_secure: cookie.secure ? 1 : 0,
          is_httponly: cookie.httpOnly ? 1 : 0,
          last_access_utc: nowChromium,
          has_expires: cookie.expires > 0 ? 1 : 0,
          is_persistent: cookie.expires > 0 ? 1 : 0,
          priority: 1,
          samesite: toChromiumSameSite(cookie.sameSite),
          source_scheme: cookie.secure ? 2 : 1,
          source_port: 443,
          last_update_utc: nowChromium,
          source_type: 0,
          is_same_party: 0,
          same_party_context: 0
        }

        const insertColumns = Object.keys(valuesByColumn).filter((column) => columns.has(column))
        const placeholders = insertColumns.map(() => '?').join(', ')
        const insertSql = `INSERT INTO cookies (${insertColumns.join(', ')}) VALUES (${placeholders})`
        const insertValues = insertColumns.map((column) => valuesByColumn[column])
        db.prepare(insertSql).run(...insertValues)
      }
    })

    apply(cookies)
    return true
  })

  return Boolean(result)
}

function clearCookiesFromChromiumDb(profileId: string): boolean {
  const result = withCookieDb(profileId, (db) => {
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'cookies'")
      .get() as { name: string } | undefined

    if (!tableExists) {
      return false
    }

    db.prepare('DELETE FROM cookies').run()
    return true
  })

  return Boolean(result)
}

function normalizeCookie(input: Partial<CookieRecord>): CookieRecord {
  return {
    domain: String(input.domain ?? ''),
    name: String(input.name ?? ''),
    value: String(input.value ?? ''),
    path: String(input.path ?? '/'),
    expires: Number.isFinite(input.expires) ? Number(input.expires) : 0,
    secure: Boolean(input.secure),
    httpOnly: Boolean(input.httpOnly),
    sameSite:
      input.sameSite === 'Strict' || input.sameSite === 'Lax' || input.sameSite === 'None'
        ? input.sameSite
        : undefined
  }
}

function parseJsonCookies(content: string): CookieRecord[] {
  const parsed = JSON.parse(content) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error('JSON cookies must be an array.')
  }

  return parsed
    .map((entry) => normalizeCookie((entry as Partial<CookieRecord>) ?? {}))
    .filter((cookie) => cookie.domain && cookie.name)
}

function parseNetscapeCookies(content: string): CookieRecord[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))

  const cookies: CookieRecord[] = []
  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length < 7) {
      continue
    }

    const [domain, , cookiePath, secure, expires, name, ...valueParts] = parts
    cookies.push(
      normalizeCookie({
        domain,
        path: cookiePath || '/',
        secure: secure.toUpperCase() === 'TRUE',
        expires: Number.parseInt(expires, 10) || 0,
        name,
        value: valueParts.join('\t')
      })
    )
  }

  return cookies.filter((cookie) => cookie.domain && cookie.name)
}

function serializeJsonCookies(cookies: CookieRecord[]): string {
  return JSON.stringify(cookies, null, 2)
}

function serializeNetscapeCookies(cookies: CookieRecord[]): string {
  const header = '# Netscape HTTP Cookie File\n# This file was generated by Multi-Profile Browser Manager\n'
  const lines = cookies.map((cookie) => {
    const includeSubdomains = cookie.domain.startsWith('.') ? 'TRUE' : 'FALSE'
    const secure = cookie.secure ? 'TRUE' : 'FALSE'
    return [
      cookie.domain,
      includeSubdomains,
      cookie.path || '/',
      secure,
      String(cookie.expires || 0),
      cookie.name,
      cookie.value
    ].join('\t')
  })

  return `${header}${lines.join('\n')}\n`
}

function parseCookies(content: string, format: CookieFormat): CookieRecord[] {
  if (!content.trim()) {
    return []
  }

  return format === 'json' ? parseJsonCookies(content) : parseNetscapeCookies(content)
}

function serializeCookies(cookies: CookieRecord[], format: CookieFormat): string {
  return format === 'json' ? serializeJsonCookies(cookies) : serializeNetscapeCookies(cookies)
}

function ensureProfileExists(profileId: string): void {
  const profile = profileRepo.getById(profileId)
  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`)
  }
}

export function setupCookieHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.COOKIES_READ, async (_event, profileId: string, format: CookieFormat): Promise<CookieReadResult> => {
    try {
      ensureProfileExists(profileId)

      const chromiumCookies = readCookiesFromChromiumDb(profileId)
      if (chromiumCookies) {
        return {
          success: true,
          format,
          cookies: chromiumCookies,
          content: serializeCookies(chromiumCookies, format)
        }
      }

      const filePath = getCookieFilePath(profileId, format)
      if (!fs.existsSync(filePath)) {
        return { success: true, format, cookies: [], content: '' }
      }

      const content = fs.readFileSync(filePath, 'utf8')
      const cookies = parseCookies(content, format)
      return { success: true, format, cookies, content }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, format, cookies: [], content: '', error: message }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.COOKIES_WRITE,
    async (_event, profileId: string, format: CookieFormat, content: string): Promise<CookieWriteResult> => {
      try {
        ensureProfileExists(profileId)
        const cookies = parseCookies(content, format)

        // Persist import payload so profile data can still be exported even when Chromium DB is absent.
        const serialized = serializeCookies(cookies, format)
        const filePath = getCookieFilePath(profileId, format)
        fs.writeFileSync(filePath, serialized, 'utf8')

        writeCookiesToChromiumDb(profileId, cookies)
        return { success: true, count: cookies.length }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, count: 0, error: message }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.COOKIES_CLEAR, async (_event, profileId: string): Promise<CookieWriteResult> => {
    try {
      ensureProfileExists(profileId)

      for (const format of ['json', 'netscape'] as const) {
        const filePath = getCookieFilePath(profileId, format)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      }

      clearCookiesFromChromiumDb(profileId)
      return { success: true, count: 0 }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, count: 0, error: message }
    }
  })
}
