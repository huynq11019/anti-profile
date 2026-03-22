import { randomUUID } from 'crypto'
import { getDb } from '../database/db'
import type { Group } from '../../shared/types'

type GroupRow = {
  id: string
  name: string
}

function toGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name
  }
}

export class GroupRepository {
  list(): Group[] {
    const rows = getDb()
      .prepare(
        `
          SELECT id, name
          FROM groups
          ORDER BY datetime(created_at) DESC
        `
      )
      .all() as GroupRow[]

    return rows.map(toGroup)
  }

  getById(id: string): Group | null {
    const row = getDb()
      .prepare(
        `
          SELECT id, name
          FROM groups
          WHERE id = ?
        `
      )
      .get(id) as GroupRow | undefined

    return row ? toGroup(row) : null
  }

  create(data: Partial<Group>): Group {
    if (!data.name || !data.name.trim()) {
      throw new Error('Group name is required.')
    }

    const id = data.id ?? randomUUID()

    getDb()
      .prepare(
        `
          INSERT INTO groups (id, name)
          VALUES (?, ?)
        `
      )
      .run(id, data.name.trim())

    const created = this.getById(id)
    if (!created) {
      throw new Error('Failed to create group.')
    }

    return created
  }

  update(id: string, data: Partial<Group>): Group {
    const current = this.getById(id)
    if (!current) {
      throw new Error(`Group not found: ${id}`)
    }

    if (typeof data.name === 'string') {
      if (!data.name.trim()) {
        throw new Error('Group name is required.')
      }

      getDb().prepare('UPDATE groups SET name = ? WHERE id = ?').run(data.name.trim(), id)
    }

    const updated = this.getById(id)
    if (!updated) {
      throw new Error(`Failed to update group: ${id}`)
    }

    return updated
  }

  delete(id: string): void {
    getDb().prepare('DELETE FROM groups WHERE id = ?').run(id)
  }
}
