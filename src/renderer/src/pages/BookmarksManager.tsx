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
  const [searchQuery, setSearchQuery] = useState('')
  const [profileSearch, setProfileSearch] = useState('')
  const [addMode, setAddMode] = useState<'single' | 'json'>('single')

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  )

  const filteredProfiles = useMemo(() => {
    const keyword = profileSearch.trim().toLowerCase()
    if (!keyword) return profiles
    return profiles.filter((p) => p.name.toLowerCase().includes(keyword))
  }, [profiles, profileSearch])

  const filteredBookmarks = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    if (!keyword) return bookmarks
    return bookmarks.filter(
      (b) =>
        b.title.toLowerCase().includes(keyword) ||
        b.url.toLowerCase().includes(keyword) ||
        (b.folder && b.folder.toLowerCase().includes(keyword))
    )
  }, [bookmarks, searchQuery])

  const folderGroups = useMemo(() => {
    const groups: Record<string, BookmarkRecord[]> = {}
    for (const bm of filteredBookmarks) {
      const key = bm.folder || 'Ungrouped'
      if (!groups[key]) groups[key] = []
      groups[key].push(bm)
    }
    return groups
  }, [filteredBookmarks])

  const stats = useMemo(() => {
    const total = bookmarks.length
    const folders = new Set(bookmarks.map((b) => b.folder).filter(Boolean)).size
    return { total, folders }
  }, [bookmarks])

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
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <section
        className="flex items-center justify-between px-10 h-[120px] border-b border-outline-variant/10 relative overflow-hidden shrink-0"
        style={{ background: 'linear-gradient(135deg, #111318 0%, #0c0e12 100%)' }}
      >
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/[0.04] to-transparent pointer-events-none" />

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Bookmarks Manager</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Manage browser bookmarks per profile — add, import, and organize
          </p>
        </div>

        <div className="flex gap-4">
          {[
            { label: 'Total', value: stats.total.toString(), color: 'on-surface' },
            { label: 'Folders', value: stats.folders.toString(), color: 'primary' },
            { label: 'Profiles', value: profiles.length.toString(), color: 'on-surface-variant' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-container-high border border-outline-variant/20
                px-5 py-3 rounded-lg min-w-[110px] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-primary/[0.06] to-transparent" />
              <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <span className={`text-xl font-bold text-${stat.color} leading-none`}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Two-Pane Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane — Profile Selector */}
        <div className="w-[260px] max-w-[28%] flex flex-col border-r border-white/[0.05] bg-surface-container-low/50">
          <div className="p-4 shrink-0">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                search
              </span>
              <input
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
                type="text"
                placeholder="Filter profiles..."
                className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary rounded pl-9 pr-3 py-1.5 text-xs text-on-surface"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-white/[0.03]">
            {filteredProfiles.length === 0 && (
              <p className="px-4 py-3 text-xs text-on-surface-variant">No profiles found.</p>
            )}

            {filteredProfiles.map((profile) => {
              const isSelected = profile.id === selectedProfileId
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setSelectedProfileId(profile.id)}
                  className={`w-full text-left px-4 py-3 border-l-2 transition-colors ${
                    isSelected
                      ? 'bg-surface-bright/50 border-primary hover:bg-surface-bright/70'
                      : 'hover:bg-surface-bright/30 border-transparent'
                  }`}
                >
                  <span className={`text-sm block mb-0.5 ${isSelected ? 'font-semibold text-on-surface' : 'font-medium text-on-surface-variant'}`}>
                    {profile.name}
                  </span>
                  <span className="text-[10px] text-on-surface-variant/70 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">bookmarks</span>
                    {isSelected ? `${bookmarks.length} bookmarks` : 'Click to manage'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Pane — Bookmark Management */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-surface">
          {/* Add / Import Section */}
          <div className="p-6 border-b border-white/[0.05] shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-on-surface">Add Bookmarks</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Target: <span className="text-primary font-semibold">{selectedProfile?.name ?? 'None selected'}</span>
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            {/* Mode Tabs */}
            <div className="flex gap-1 mb-4 bg-surface-container-highest/50 p-1 rounded-lg w-fit">
              {[
                { key: 'single' as const, label: 'Quick Add', icon: 'add_link' },
                { key: 'json' as const, label: 'Import JSON', icon: 'data_object' },
              ].map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => setAddMode(mode.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    addMode === mode.key
                      ? 'bg-primary/20 text-primary'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{mode.icon}</span>
                  {mode.label}
                </button>
              ))}
            </div>

            {addMode === 'single' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                      title
                    </span>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Bookmark title"
                      className="w-full bg-surface-container-highest border border-outline-variant/20
                        focus:ring-1 focus:ring-primary/30 rounded-lg pl-9 pr-3 py-2.5 text-sm text-on-surface
                        placeholder:text-on-surface-variant/60"
                    />
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                      link
                    </span>
                    <input
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder="https://example.com"
                      className="w-full bg-surface-container-highest border border-outline-variant/20
                        focus:ring-1 focus:ring-primary/30 rounded-lg pl-9 pr-3 py-2.5 text-sm text-on-surface
                        placeholder:text-on-surface-variant/60"
                    />
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                      folder
                    </span>
                    <input
                      value={folder}
                      onChange={(event) => setFolder(event.target.value)}
                      placeholder="Folder (optional)"
                      className="w-full bg-surface-container-highest border border-outline-variant/20
                        focus:ring-1 focus:ring-primary/30 rounded-lg pl-9 pr-3 py-2.5 text-sm text-on-surface
                        placeholder:text-on-surface-variant/60"
                    />
                  </div>
                </div>
                <button
                  onClick={() => void addBookmark()}
                  disabled={!selectedProfileId || !title.trim() || !url.trim()}
                  className="btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
                  Add Bookmark
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={jsonInput}
                  onChange={(event) => setJsonInput(event.target.value)}
                  placeholder='[{"title":"Docs","url":"https://example.com","folder":"Dev"}]'
                  rows={4}
                  className="w-full bg-surface-container-highest border border-outline-variant/20
                    focus:ring-1 focus:ring-primary/30 rounded-lg px-4 py-3 text-sm text-on-surface font-mono
                    placeholder:text-on-surface-variant/60 resize-none"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => void onImportFromText()}
                    disabled={!selectedProfileId || !jsonInput.trim()}
                    className="btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[18px]">data_object</span>
                    Import from Text
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!selectedProfileId}
                    className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface
                      px-4 py-2.5 rounded-lg border border-outline-variant/20 hover:bg-surface-container-highest
                      transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    Upload JSON File
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
            )}
          </div>

          {/* Bookmarks List */}
          <div className="flex-1 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-widest">
                Bookmarks ({filteredBookmarks.length})
              </h2>

              <div className="relative w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                  search
                </span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  type="text"
                  placeholder="Search bookmarks..."
                  className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary rounded pl-9 pr-3 py-1.5 text-xs text-on-surface"
                />
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-[32px] animate-spin mr-3">progress_activity</span>
                <span className="text-sm">Loading bookmarks...</span>
              </div>
            )}

            {!isLoading && filteredBookmarks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="material-symbols-outlined text-[48px] text-primary opacity-20">bookmark_border</span>
                <p className="text-sm text-on-surface-variant">
                  {searchQuery ? 'No bookmarks match your search.' : 'No bookmarks for this profile.'}
                </p>
                <p className="text-xs text-on-surface-variant/60">Use the section above to add or import bookmarks.</p>
              </div>
            )}

            {!isLoading && Object.entries(folderGroups).map(([folderName, items]) => (
              <div key={folderName} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[16px] text-primary/60">
                    {folderName === 'Ungrouped' ? 'bookmark' : 'folder'}
                  </span>
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    {folderName}
                  </h3>
                  <span className="text-[10px] text-on-surface-variant/50 font-semibold">
                    ({items.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {items.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className="group bg-surface-container-low rounded-lg border border-outline-variant/10
                        hover:border-outline-variant/25 transition-colors"
                    >
                      <div className="flex items-center gap-4 px-5 py-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20
                          flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[16px] text-primary">bookmark</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">
                            {bookmark.title}
                          </p>
                          <p className="text-xs text-primary/70 truncate font-mono">
                            {bookmark.url}
                          </p>
                        </div>

                        <button
                          onClick={() => void deleteBookmark(bookmark.id)}
                          className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-md transition-colors
                            opacity-0 group-hover:opacity-100"
                          aria-label="Delete bookmark"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookmarksManager
