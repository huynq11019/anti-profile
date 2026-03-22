import { randomInt, randomUUID } from 'crypto'
import { getDb } from '../database/db'
import type { Profile } from '../../shared/types'

type ProfileRow = {
  id: string
  name: string
  group_id: string | null
  note: string | null
  proxy_id: string | null
  fingerprint_seed: number | null
  user_agent: string | null
  timezone: string | null
  tags: string | null
  is_pinned: number
  last_opened: string | null
  created_at: string
}

function parseTags(raw: string | null): string[] | undefined {
  if (!raw) return undefined

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return undefined
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return undefined
  }
}

export class ProfileRepository {
  private readonly hasFingerprintSeedColumn: boolean
  private readonly hasTagsColumn: boolean

  constructor() {
    this.hasFingerprintSeedColumn = this.ensureFingerprintSeedColumn()
    this.hasTagsColumn = this.ensureTagsColumn()
  }

  private ensureFingerprintSeedColumn(): boolean {
    const columns = getDb()
      .prepare('PRAGMA table_info(profiles)')
      .all() as Array<{ name: string }>

    const hasFingerprintSeed = columns.some((column) => column.name === 'fingerprint_seed')
    if (hasFingerprintSeed) return true

    getDb().exec('ALTER TABLE profiles ADD COLUMN fingerprint_seed INTEGER')
    getDb().exec('UPDATE profiles SET fingerprint_seed = (abs(random()) % 900000) + 100000 WHERE fingerprint_seed IS NULL')
    return true
  }

  private ensureTagsColumn(): boolean {
    const columns = getDb()
      .prepare('PRAGMA table_info(profiles)')
      .all() as Array<{ name: string }>

    const hasTags = columns.some((column) => column.name === 'tags')
    if (hasTags) return true

    getDb().exec('ALTER TABLE profiles ADD COLUMN tags TEXT')
    return true
  }

  private toProfile(row: ProfileRow): Profile {
    return {
      id: row.id,
      name: row.name,
      groupId: row.group_id ?? undefined,
      note: row.note ?? undefined,
      proxyId: row.proxy_id ?? undefined,
      fingerprintSeed: row.fingerprint_seed ?? randomInt(100000, 999999),
      userAgent: row.user_agent ?? undefined,
      timezone: row.timezone ?? undefined,
      tags: parseTags(row.tags),
      isPinned: Boolean(row.is_pinned),
      lastOpened: row.last_opened ?? undefined,
      createdAt: row.created_at,
      status: 'idle'
    }
  }

  list(): Profile[] {
    const rows = getDb()
      .prepare(
        `
          SELECT id, name, group_id, note, proxy_id, ${this.hasFingerprintSeedColumn ? 'fingerprint_seed,' : ''} user_agent, timezone,
                 ${this.hasTagsColumn ? 'tags,' : ''} is_pinned, last_opened, created_at
          FROM profiles
          ORDER BY is_pinned DESC, datetime(created_at) DESC
        `
      )
      .all() as ProfileRow[]

    return rows.map((row) => this.toProfile(row))
  }

  getById(id: string): Profile | null {
    const row = getDb()
      .prepare(
        `
          SELECT id, name, group_id, note, proxy_id, ${this.hasFingerprintSeedColumn ? 'fingerprint_seed,' : ''} user_agent, timezone,
                 ${this.hasTagsColumn ? 'tags,' : ''} is_pinned, last_opened, created_at
          FROM profiles
          WHERE id = ?
        `
      )
      .get(id) as ProfileRow | undefined

    return row ? this.toProfile(row) : null
  }

  create(data: Partial<Profile>): Profile {
    if (!data.name || !data.name.trim()) {
      throw new Error('Profile name is required.')
    }

    const id = data.id ?? randomUUID()
    const fingerprintSeed = data.fingerprintSeed ?? randomInt(100000, 999999)

    if (this.hasTagsColumn) {
      getDb()
        .prepare(
          `
            INSERT INTO profiles (id, name, fingerprint_seed, proxy_id, user_agent, timezone, note, tags, is_pinned, group_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .run(
          id,
          data.name.trim(),
          fingerprintSeed,
          data.proxyId ?? null,
          data.userAgent ?? null,
          data.timezone ?? null,
          data.note ?? null,
          data.tags?.length ? JSON.stringify(data.tags) : null,
          data.isPinned ? 1 : 0,
          data.groupId ?? null
        )
    } else {
      getDb()
        .prepare(
          `
            INSERT INTO profiles (id, name, fingerprint_seed, proxy_id, user_agent, timezone, note, is_pinned, group_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .run(
          id,
          data.name.trim(),
          fingerprintSeed,
          data.proxyId ?? null,
          data.userAgent ?? null,
          data.timezone ?? null,
          data.note ?? null,
          data.isPinned ? 1 : 0,
          data.groupId ?? null
        )
    }

    const created = this.getById(id)
    if (!created) {
      throw new Error('Failed to create profile.')
    }

    return created
  }

  update(id: string, data: Partial<Profile>): Profile {
    const current = this.getById(id)
    if (!current) {
      throw new Error(`Profile not found: ${id}`)
    }

    const updates: string[] = []
    const values: unknown[] = []

    if (typeof data.name === 'string') {
      updates.push('name = ?')
      values.push(data.name.trim())
    }
    if (typeof data.proxyId === 'string' || data.proxyId === undefined) {
      updates.push('proxy_id = ?')
      values.push(data.proxyId ?? null)
    }
    if (typeof data.userAgent === 'string' || data.userAgent === undefined) {
      updates.push('user_agent = ?')
      values.push(data.userAgent ?? null)
    }
    if (typeof data.fingerprintSeed === 'number') {
      updates.push('fingerprint_seed = ?')
      values.push(Math.abs(Math.trunc(data.fingerprintSeed)) || randomInt(100000, 999999))
    }
    if (typeof data.timezone === 'string' || data.timezone === undefined) {
      updates.push('timezone = ?')
      values.push(data.timezone ?? null)
    }
    if (typeof data.note === 'string' || data.note === undefined) {
      updates.push('note = ?')
      values.push(data.note ?? null)
    }
    if (typeof data.groupId === 'string' || data.groupId === undefined) {
      updates.push('group_id = ?')
      values.push(data.groupId ?? null)
    }
    if (this.hasTagsColumn && (Array.isArray(data.tags) || data.tags === undefined)) {
      updates.push('tags = ?')
      values.push(data.tags?.length ? JSON.stringify(data.tags) : null)
    }
    if (typeof data.isPinned === 'boolean') {
      updates.push('is_pinned = ?')
      values.push(data.isPinned ? 1 : 0)
    }
    if (typeof data.lastOpened === 'string' || data.lastOpened === undefined) {
      updates.push('last_opened = ?')
      values.push(data.lastOpened ?? null)
    }

    if (updates.length > 0) {
      values.push(id)
      getDb()
        .prepare(`UPDATE profiles SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(...values)
    }

    const updated = this.getById(id)
    if (!updated) {
      throw new Error(`Failed to update profile: ${id}`)
    }

    return updated
  }

  delete(id: string): void {
    getDb().prepare('DELETE FROM profiles WHERE id = ?').run(id)
  }
}
