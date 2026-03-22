import { randomUUID } from 'crypto'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { getDb } from '../database/db'
import type { BookmarkRecord } from '../../shared/types'
import { ProfileRepository } from './profileRepo'
import { hasRunningProfileProcess } from '../browser/processTracker'

type BookmarkRow = {
  id: string
  profile_id: string
  title: string
  url: string
  folder: string | null
  created_at: string
}

function toBookmark(row: BookmarkRow): BookmarkRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    title: row.title,
    url: row.url,
    folder: row.folder ?? undefined,
    createdAt: row.created_at
  }
}

function chromiumTimestamp(): string {
  const epoch = Date.UTC(1601, 0, 1)
  const now = Date.now()
  return String((now - epoch) * 1000)
}

function profileBookmarksFile(profileId: string): string {
  const filePath = path.join(app.getPath('userData'), 'profiles', profileId, 'user-data', 'Default', 'Bookmarks')
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return filePath
}

function ensureNotRunning(profileId: string): void {
  if (hasRunningProfileProcess(profileId)) {
    throw new Error('Profile is currently running. Please restart profile after closing browser before modifying bookmarks.')
  }
}

export class BookmarkRepository {
  private readonly profileRepo = new ProfileRepository()

  list(profileId: string): BookmarkRecord[] {
    return getDb()
      .prepare(
        `
          SELECT id, profile_id, title, url, folder, created_at
          FROM profile_bookmarks
          WHERE profile_id = ?
          ORDER BY datetime(created_at) DESC
        `
      )
      .all(profileId)
      .map((row) => toBookmark(row as BookmarkRow))
  }

  add(profileId: string, data: { title: string; url: string; folder?: string }): BookmarkRecord {
    this.ensureProfile(profileId)
    ensureNotRunning(profileId)

    const normalizedTitle = data.title.trim()
    const normalizedUrl = data.url.trim()

    if (!normalizedTitle) throw new Error('Bookmark title is required.')
    if (!/^https?:\/\//i.test(normalizedUrl)) throw new Error('Bookmark URL must start with http:// or https://')

    const id = randomUUID()
    getDb()
      .prepare(
        `
          INSERT INTO profile_bookmarks (id, profile_id, title, url, folder)
          VALUES (?, ?, ?, ?, ?)
        `
      )
      .run(id, profileId, normalizedTitle, normalizedUrl, data.folder?.trim() || null)

    this.syncChromiumBookmarks(profileId)

    const created = this.getById(profileId, id)
    if (!created) {
      throw new Error('Failed to create bookmark.')
    }

    return created
  }

  delete(profileId: string, bookmarkId: string): void {
    this.ensureProfile(profileId)
    ensureNotRunning(profileId)

    getDb()
      .prepare('DELETE FROM profile_bookmarks WHERE id = ? AND profile_id = ?')
      .run(bookmarkId, profileId)

    this.syncChromiumBookmarks(profileId)
  }

  importJson(profileId: string, jsonContent: string): number {
    this.ensureProfile(profileId)
    ensureNotRunning(profileId)

    const parsed = JSON.parse(jsonContent) as unknown
    if (!Array.isArray(parsed)) {
      throw new Error('Bookmark import JSON must be an array.')
    }

    const insert = getDb().prepare(
      'INSERT INTO profile_bookmarks (id, profile_id, title, url, folder) VALUES (?, ?, ?, ?, ?)'
    )

    const insertMany = getDb().transaction((items: Array<{ title: string; url: string; folder?: string }>) => {
      for (const item of items) {
        const title = item.title?.trim()
        const url = item.url?.trim()
        if (!title || !url || !/^https?:\/\//i.test(url)) {
          continue
        }

        insert.run(randomUUID(), profileId, title, url, item.folder?.trim() || null)
      }
    })

    const normalized = parsed
      .map((item) => item as { title?: string; url?: string; folder?: string })
      .filter((item) => typeof item.title === 'string' && typeof item.url === 'string')
      .map((item) => ({ title: item.title!, url: item.url!, folder: item.folder }))

    insertMany(normalized)
    this.syncChromiumBookmarks(profileId)
    return normalized.length
  }

  private getById(profileId: string, bookmarkId: string): BookmarkRecord | null {
    const row = getDb()
      .prepare(
        `
          SELECT id, profile_id, title, url, folder, created_at
          FROM profile_bookmarks
          WHERE id = ? AND profile_id = ?
        `
      )
      .get(bookmarkId, profileId) as BookmarkRow | undefined

    return row ? toBookmark(row) : null
  }

  private ensureProfile(profileId: string): void {
    const profile = this.profileRepo.getById(profileId)
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`)
    }
  }

  private syncChromiumBookmarks(profileId: string): void {
    const filePath = profileBookmarksFile(profileId)
    const bookmarks = this.list(profileId).reverse()

    const children = bookmarks.map((bookmark, index) => ({
      id: String(index + 1),
      name: bookmark.title,
      type: 'url',
      url: bookmark.url,
      date_added: chromiumTimestamp(),
      date_last_used: '0'
    }))

    const payload = {
      checksum: '',
      roots: {
        bookmark_bar: {
          children,
          date_added: chromiumTimestamp(),
          date_modified: chromiumTimestamp(),
          id: '1',
          name: 'Bookmarks Bar',
          type: 'folder'
        },
        other: {
          children: [],
          date_added: chromiumTimestamp(),
          date_modified: chromiumTimestamp(),
          id: '2',
          name: 'Other Bookmarks',
          type: 'folder'
        },
        synced: {
          children: [],
          date_added: chromiumTimestamp(),
          date_modified: chromiumTimestamp(),
          id: '3',
          name: 'Mobile Bookmarks',
          type: 'folder'
        }
      },
      version: 1
    }

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8')
  }
}
