import { randomUUID } from 'crypto'
import { getDb } from '../database/db'
import type { Proxy } from '../../shared/types'

type ProxyRow = {
  id: string
  alias: string | null
  protocol: string
  host: string
  port: number
  username: string | null
  password: string | null
  last_tested: string | null
}

function toProxy(row: ProxyRow): Proxy {
  const normalizedProtocol = row.protocol.toLowerCase() === 'socks5' ? 'socks5' : 'http'

  return {
    id: row.id,
    alias: row.alias ?? `${row.host}:${row.port}`,
    protocol: normalizedProtocol,
    host: row.host,
    port: row.port,
    username: row.username ?? undefined,
    password: row.password ?? undefined,
    lastTested: row.last_tested ?? undefined,
    testStatus: 'unknown'
  }
}

export class ProxyRepository {
  list(): Proxy[] {
    const rows = getDb()
      .prepare(
        `
          SELECT id, alias, protocol, host, port, username, password, last_tested
          FROM proxies
          ORDER BY datetime(created_at) DESC
        `
      )
      .all() as ProxyRow[]

    return rows.map(toProxy)
  }

  getById(id: string): Proxy | null {
    const row = getDb()
      .prepare(
        `
          SELECT id, alias, protocol, host, port, username, password, last_tested
          FROM proxies
          WHERE id = ?
        `
      )
      .get(id) as ProxyRow | undefined

    return row ? toProxy(row) : null
  }

  create(data: Partial<Proxy>): Proxy {
    if (!data.host || !data.host.trim()) {
      throw new Error('Proxy host is required.')
    }

    const id = data.id ?? randomUUID()
    const protocol = data.protocol === 'socks5' ? 'socks5' : 'http'
    const port = Number(data.port)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('Proxy port must be an integer between 1 and 65535.')
    }

    getDb()
      .prepare(
        `
          INSERT INTO proxies (id, alias, protocol, host, port, username, password)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        id,
        data.alias?.trim() || `${data.host.trim()}:${port}`,
        protocol,
        data.host.trim(),
        port,
        data.username?.trim() || null,
        data.password || null
      )

    const created = this.getById(id)
    if (!created) {
      throw new Error('Failed to create proxy.')
    }

    return created
  }

  update(id: string, data: Partial<Proxy>): Proxy {
    const current = this.getById(id)
    if (!current) {
      throw new Error(`Proxy not found: ${id}`)
    }

    const updates: string[] = []
    const values: unknown[] = []

    if (typeof data.alias === 'string') {
      updates.push('alias = ?')
      values.push(data.alias.trim())
    }
    if (typeof data.host === 'string') {
      if (!data.host.trim()) {
        throw new Error('Proxy host is required.')
      }
      updates.push('host = ?')
      values.push(data.host.trim())
    }
    if (typeof data.protocol === 'string') {
      updates.push('protocol = ?')
      values.push(data.protocol === 'socks5' ? 'socks5' : 'http')
    }
    if (typeof data.port === 'number') {
      if (!Number.isInteger(data.port) || data.port < 1 || data.port > 65535) {
        throw new Error('Proxy port must be an integer between 1 and 65535.')
      }
      updates.push('port = ?')
      values.push(data.port)
    }
    if (typeof data.username === 'string' || data.username === undefined) {
      updates.push('username = ?')
      values.push(data.username?.trim() || null)
    }
    if (typeof data.password === 'string' || data.password === undefined) {
      updates.push('password = ?')
      values.push(data.password || null)
    }
    if (typeof data.lastTested === 'string' || data.lastTested === undefined) {
      updates.push('last_tested = ?')
      values.push(data.lastTested || null)
    }

    if (updates.length > 0) {
      values.push(id)
      getDb().prepare(`UPDATE proxies SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    }

    const updated = this.getById(id)
    if (!updated) {
      throw new Error(`Failed to update proxy: ${id}`)
    }

    return updated
  }

  delete(id: string): void {
    getDb().prepare('DELETE FROM proxies WHERE id = ?').run(id)
  }
}
