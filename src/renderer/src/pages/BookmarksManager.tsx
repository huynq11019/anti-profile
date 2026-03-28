/// <reference path="../../../shared/types/window.d.ts" />
import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { BookmarkRecord, Profile } from '../../../shared/types'
import { emitToast, ensureIpcSuccess, runIpcAction } from '../utils/errorHandler'

export const BookmarksManager: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [folder, setFolder] = useState('')
  const [jsonInput, setJsonInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  )

  const loadProfiles = async () => {
    const fetched = await runIpcAction(() => window.api.profiles.getAll(), {
      title: 'Unable to load profiles',
      fallbackMessage: 'Failed to load profiles.',
      context: 'bookmarks.loadProfiles',
      onError: (message) => setError(message)
    })

    if (fetched) {
      setProfiles(fetched)
      setSelectedProfileId((prev) => prev || fetched[0]?.id || '')
    }
  }

  const loadBookmarks = async (profileId: string) => {
    if (!profileId) {
      setBookmarks([])
      return
    }

    setIsLoading(true)
    setError(null)
    const items = await runIpcAction(() => window.api.bookmarks.list(profileId), {
      title: 'Unable to load bookmarks',
      fallbackMessage: 'Failed to load bookmarks.',
      context: 'bookmarks.load',
      onError: (message) => setError(message)
    })

    if (items) {
      setBookmarks(items)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    void loadProfiles()
  }, [])

  useEffect(() => {
    void loadBookmarks(selectedProfileId)
  }, [selectedProfileId])

  const addBookmark = async () => {
    if (!selectedProfileId) return

    setError(null)
    const added = await runIpcAction(async () => {
      ensureIpcSuccess(
        await window.api.bookmarks.add(selectedProfileId, {
          title,
          url,
          folder: folder || undefined
        }),
        'Failed to add bookmark.'
      )

      setTitle('')
      setUrl('')
      setFolder('')
      await loadBookmarks(selectedProfileId)
      return true
    }, {
      title: 'Add bookmark failed',
      fallbackMessage: 'Failed to add bookmark.',
      context: 'bookmarks.add',
      onError: (message) => setError(message)
    })

    if (added) {
      emitToast({ title: 'Bookmark added', variant: 'success' })
    }
  }

  const deleteBookmark = async (bookmarkId: string) => {
    if (!selectedProfileId) return

    const removed = await runIpcAction(async () => {
      ensureIpcSuccess(await window.api.bookmarks.delete(selectedProfileId, bookmarkId), 'Failed to delete bookmark.')

      await loadBookmarks(selectedProfileId)
      return true
    }, {
      title: 'Delete bookmark failed',
      fallbackMessage: 'Failed to delete bookmark.',
      context: 'bookmarks.delete',
      onError: (message) => setError(message)
    })

    if (removed) {
      emitToast({ title: 'Bookmark removed', variant: 'success' })
    }
  }

  const importJson = async (content: string) => {
    if (!selectedProfileId) return

    const imported = await runIpcAction(async () => {
      ensureIpcSuccess(await window.api.bookmarks.importJson(selectedProfileId, content), 'Failed to import bookmarks.')

      setJsonInput('')
      await loadBookmarks(selectedProfileId)
      return true
    }, {
      title: 'Bookmark import failed',
      fallbackMessage: 'Failed to import bookmarks.',
      context: 'bookmarks.import',
      onError: (message) => setError(message)
    })

    if (imported) {
      emitToast({ title: 'Bookmarks imported', variant: 'success' })
    }
  }

  const onImportFromText = async () => {
    if (!jsonInput.trim()) {
      const message = 'Paste JSON content before importing.'
      setError(message)
      emitToast({ title: 'Missing JSON content', message, variant: 'warning' })
      return
    }

    await importJson(jsonInput)
  }

  const onImportFromFile = async (file: File) => {
    const content = await file.text()
    await importJson(content)
  }

  return (
    <div className="h-full flex flex-col pt-4">
      <div className="px-8 pb-4 border-b border-white/[0.05] shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface mb-1">Bookmarks Management</h1>
        <p className="text-sm text-on-surface-variant">
          Add, delete, and import bookmarks by profile. If profile is running, app will request restart first.
        </p>
      </div>

      <div className="p-8 overflow-auto grid grid-cols-[280px_1fr] gap-6 h-full">
        <div className="bg-surface-container-low rounded-lg border border-outline-variant/10 p-4">
          <h2 className="text-sm font-bold text-on-surface mb-3">Profiles</h2>
          <div className="space-y-1 max-h-[520px] overflow-auto">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => setSelectedProfileId(profile.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  selectedProfileId === profile.id
                    ? 'bg-surface-bright border border-primary/40 text-on-surface'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {profile.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {error && (
            <div className="rounded border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="bg-surface-container-low rounded-lg border border-outline-variant/10 p-4">
            <h2 className="text-sm font-bold text-on-surface mb-3">Quick Add Bookmark</h2>
            <p className="text-xs text-on-surface-variant mb-3">
              Target profile: {selectedProfile?.name ?? 'None selected'}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Title"
                className="bg-surface-container-highest border border-outline-variant/20 rounded px-3 py-2 text-sm"
              />
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com"
                className="bg-surface-container-highest border border-outline-variant/20 rounded px-3 py-2 text-sm"
              />
              <input
                value={folder}
                onChange={(event) => setFolder(event.target.value)}
                placeholder="Folder (optional)"
                className="bg-surface-container-highest border border-outline-variant/20 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-3">
              <button className="btn-primary text-sm" onClick={() => void addBookmark()}>
                Add Bookmark
              </button>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-lg border border-outline-variant/10 p-4">
            <h2 className="text-sm font-bold text-on-surface mb-3">Import from JSON</h2>
            <textarea
              value={jsonInput}
              onChange={(event) => setJsonInput(event.target.value)}
              placeholder='[{"title":"Docs","url":"https://example.com"}]'
              rows={5}
              className="w-full bg-surface-container-highest border border-outline-variant/20 rounded px-3 py-2 text-sm"
            />
            <div className="mt-3 flex items-center gap-2">
              <button className="btn-secondary text-sm" onClick={() => fileInputRef.current?.click()}>
                Import JSON File
              </button>
              <button className="btn-primary text-sm" onClick={() => void onImportFromText()}>
                Import Text
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  void onImportFromFile(file)
                  event.target.value = ''
                }}
              />
            </div>
          </div>

          <div className="bg-surface-container-low rounded-lg border border-outline-variant/10 p-4">
            <h2 className="text-sm font-bold text-on-surface mb-3">Bookmarks ({bookmarks.length})</h2>
            {isLoading && <p className="text-xs text-on-surface-variant">Loading...</p>}
            {!isLoading && bookmarks.length === 0 && (
              <p className="text-xs text-on-surface-variant">No bookmarks for selected profile.</p>
            )}
            <div className="space-y-2">
              {bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="flex items-start justify-between gap-3 border border-outline-variant/10 rounded p-3">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{bookmark.title}</p>
                    <p className="text-xs text-primary break-all">{bookmark.url}</p>
                    {bookmark.folder && <p className="text-[11px] text-on-surface-variant mt-1">Folder: {bookmark.folder}</p>}
                  </div>
                  <button
                    className="p-1.5 text-on-surface-variant hover:text-error"
                    onClick={() => void deleteBookmark(bookmark.id)}
                    aria-label="Delete bookmark"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookmarksManager
