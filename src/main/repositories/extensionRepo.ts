import { randomUUID } from 'crypto'
import { getDb } from '../database/db'
import type { ProfileExtensionRecord } from '../../shared/types'

type ExtensionRow = {
  id: string
  profile_id: string
  extension_name: string
  extension_path: string
  source: 'unpacked' | 'crx' | 'webstore'
  source_ref: string | null
  enabled: number
  created_at: string
}

function toExtension(row: ExtensionRow): ProfileExtensionRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    extensionName: row.extension_name,
    extensionPath: row.extension_path,
    source: row.source,
    sourceRef: row.source_ref ?? undefined,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at
  }
}

export class ExtensionRepository {
  list(profileId: string): ProfileExtensionRecord[] {
    return getDb()
      .prepare(
        `
          SELECT id, profile_id, extension_name, extension_path, source, source_ref, enabled, created_at
          FROM profile_extensions
          WHERE profile_id = ?
          ORDER BY datetime(created_at) DESC
        `
      )
      .all(profileId)
      .map((row) => toExtension(row as ExtensionRow))
  }

  listEnabled(profileId: string): ProfileExtensionRecord[] {
    return getDb()
      .prepare(
        `
          SELECT id, profile_id, extension_name, extension_path, source, source_ref, enabled, created_at
          FROM profile_extensions
          WHERE profile_id = ? AND enabled = 1
          ORDER BY datetime(created_at) DESC
        `
      )
      .all(profileId)
      .map((row) => toExtension(row as ExtensionRow))
  }

  add(profileId: string, data: { extensionName: string; extensionPath: string; source: 'unpacked' | 'crx' | 'webstore'; sourceRef?: string }): ProfileExtensionRecord {
    const id = randomUUID()

    getDb()
      .prepare(
        `
          INSERT INTO profile_extensions (id, profile_id, extension_name, extension_path, source, source_ref, enabled)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `
      )
      .run(id, profileId, data.extensionName, data.extensionPath, data.source, data.sourceRef ?? null)

    const created = this.getById(profileId, id)
    if (!created) {
      throw new Error('Failed to create extension record.')
    }

    return created
  }

  toggle(profileId: string, extensionId: string, enabled: boolean): void {
    getDb()
      .prepare('UPDATE profile_extensions SET enabled = ? WHERE id = ? AND profile_id = ?')
      .run(enabled ? 1 : 0, extensionId, profileId)
  }

  delete(profileId: string, extensionId: string): void {
    getDb()
      .prepare('DELETE FROM profile_extensions WHERE id = ? AND profile_id = ?')
      .run(extensionId, profileId)
  }

  private getById(profileId: string, extensionId: string): ProfileExtensionRecord | null {
    const row = getDb()
      .prepare(
        `
          SELECT id, profile_id, extension_name, extension_path, source, source_ref, enabled, created_at
          FROM profile_extensions
          WHERE id = ? AND profile_id = ?
        `
      )
      .get(extensionId, profileId) as ExtensionRow | undefined

    return row ? toExtension(row) : null
  }
}
