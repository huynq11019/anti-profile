import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { CookieFormat, CookieRecord, Profile } from '@shared/types'

export const CookiesManager: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true)
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [format, setFormat] = useState<CookieFormat>('json')
  const [cookies, setCookies] = useState<CookieRecord[]>([])
  const [isLoadingCookies, setIsLoadingCookies] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const filteredProfiles = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    if (!keyword) {
      return profiles
    }

    return profiles.filter((profile) => profile.name.toLowerCase().includes(keyword))
  }, [profiles, searchQuery])

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  )

  const loadProfiles = async () => {
    setIsLoadingProfiles(true)
    setError(null)
    try {
      const fetched = await window.api.profiles.getAll()
      setProfiles(fetched)
      setSelectedProfileId((current) => current || fetched[0]?.id || '')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profiles.'
      setError(message)
    } finally {
      setIsLoadingProfiles(false)
    }
  }

  const loadCookies = async (profileId: string, targetFormat: CookieFormat) => {
    if (!profileId) {
      setCookies([])
      return
    }

    setIsLoadingCookies(true)
    setError(null)
    try {
      const result = await window.api.cookies.read(profileId, targetFormat)
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to read cookies.')
      }
      setCookies(result.cookies)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load cookies.'
      setError(message)
      setCookies([])
    } finally {
      setIsLoadingCookies(false)
    }
  }

  useEffect(() => {
    void loadProfiles()
  }, [])

  useEffect(() => {
    if (!selectedProfileId) {
      setCookies([])
      return
    }
    void loadCookies(selectedProfileId, format)
  }, [selectedProfileId, format])

  const detectFormat = (filename: string): CookieFormat => {
    const normalized = filename.trim().toLowerCase()
    if (normalized.endsWith('.json')) {
      return 'json'
    }
    return 'netscape'
  }

  const importCookieFile = async (file: File) => {
    if (!selectedProfileId) {
      setError('Please select a profile before importing cookies.')
      return
    }

    setError(null)
    const content = await file.text()
    const importedFormat = detectFormat(file.name)
    setFormat(importedFormat)

    const result = await window.api.cookies.write(selectedProfileId, importedFormat, content)
    if (!result.success) {
      setError(result.error ?? 'Failed to import cookie file.')
      return
    }

    await loadCookies(selectedProfileId, importedFormat)
  }

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    setDragActive(false)

    const file = event.dataTransfer.files?.[0]
    if (!file) {
      return
    }

    void importCookieFile(file)
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    void importCookieFile(file)
    event.target.value = ''
  }

  const handleExport = async () => {
    if (!selectedProfileId) {
      setError('Please select a profile before exporting cookies.')
      return
    }

    try {
      const result = await window.api.cookies.read(selectedProfileId, format)
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to export cookies.')
      }

      const extension = format === 'json' ? 'json' : 'txt'
      const profileName = (selectedProfile?.name ?? 'profile').replace(/\s+/g, '_')
      const blob = new Blob([result.content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${profileName}_cookies.${extension}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export cookies.'
      setError(message)
    }
  }

  const handleClear = async () => {
    if (!selectedProfileId) {
      setError('Please select a profile before clearing cookies.')
      return
    }

    const result = await window.api.cookies.clear(selectedProfileId)
    if (!result.success) {
      setError(result.error ?? 'Failed to clear cookies.')
      return
    }

    setCookies([])
  }

  return (
    <div className="h-full flex flex-col pt-4">
      <div className="px-8 pb-4 border-b border-white/[0.05] shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface mb-1">Cookies Management</h1>
        <p className="text-sm text-on-surface-variant">Import, export, and manage session cookies for isolated profiles</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Pane - Profile Selector */}
        <div className="w-[280px] max-w-[30%] flex flex-col border-r border-white/[0.05] bg-surface-container-low/50">
          <div className="p-4 shrink-0">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">search</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                type="text"
                placeholder="Filter profiles..."
                className="w-full bg-surface-container-highest border-none focus:ring-1 focus:ring-primary rounded pl-9 pr-3 py-1.5 text-xs text-on-surface"
              />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 divide-y divide-white/[0.03]">
            {isLoadingProfiles && <p className="px-4 py-3 text-xs text-on-surface-variant">Loading profiles...</p>}

            {!isLoadingProfiles && filteredProfiles.length === 0 && (
              <p className="px-4 py-3 text-xs text-on-surface-variant">No profile matched your filter.</p>
            )}

            {!isLoadingProfiles &&
              filteredProfiles.map((profile) => {
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
                    <span className={`text-sm block mb-1 ${isSelected ? 'font-semibold text-on-surface' : 'font-medium text-on-surface-variant'}`}>
                      {profile.name}
                    </span>
                    <span className="text-[10px] text-on-surface-variant/70 rounded block">
                      {isSelected ? `${cookies.length} cookies loaded` : 'Click to view cookies'}
                    </span>
                  </button>
                )
              })}
          </div>
        </div>

        {/* Right Pane - Cookie Editor */}
        <div className="flex-1 flex flex-col p-8 bg-surface overflow-y-auto">
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-on-surface">Cookies Data</h2>
            <div className="flex gap-3 items-center">
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value as CookieFormat)}
                className="bg-surface-container-highest border border-outline-variant/20 focus:ring-1 focus:ring-primary/30 rounded-lg py-1.5 pl-3 pr-8 text-xs text-on-surface"
              >
                <option value="json">JSON</option>
                <option value="netscape">Netscape/TXT</option>
              </select>
              <button onClick={() => void handleClear()} className="btn-secondary text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">delete</span> Clear All
              </button>
              <button onClick={() => void handleExport()} className="btn-secondary text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">download</span> Export JSON
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(event) => {
              event.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            className={`border-2 border-dashed transition-colors rounded-xl p-10 flex flex-col items-center justify-center bg-surface-container-low mb-8 ${
              dragActive ? 'border-primary/70' : 'border-outline-variant/50 hover:border-primary/50'
            }`}
          >
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4">cloud_upload</span>
            <p className="text-sm text-on-surface font-semibold mb-1">Drag and drop Cookie file here</p>
            <p className="text-xs text-on-surface-variant mb-4 flex gap-1">Supports <span className="font-mono bg-surface-container-highest px-1 rounded">JSON</span> and <span className="font-mono bg-surface-container-highest px-1 rounded">Netscape/TXT</span> formats</p>
            <button onClick={handleBrowseClick} className="btn-primary text-xs">Browse Files</button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.txt"
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">
            Preview ({selectedProfile?.name ?? 'No profile selected'})
          </p>
          <div className="bg-surface-container-highest/20 rounded-lg border border-outline-variant/20 overflow-hidden font-mono text-[11px] p-0 flex-1 min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container/50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-on-surface-variant font-semibold">Domain</th>
                  <th className="px-4 py-2 text-on-surface-variant font-semibold">Name</th>
                  <th className="px-4 py-2 text-on-surface-variant font-semibold">Value</th>
                  <th className="px-4 py-2 text-on-surface-variant font-semibold w-24">Path</th>
                  <th className="px-4 py-2 text-on-surface-variant font-semibold w-24">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {isLoadingCookies && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">
                      Loading cookies...
                    </td>
                  </tr>
                )}

                {!isLoadingCookies && cookies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">
                      No cookies available for this profile and format.
                    </td>
                  </tr>
                )}

                {!isLoadingCookies &&
                  cookies.map((cookie, index) => (
                    <tr key={`${cookie.domain}-${cookie.name}-${index}`} className="hover:bg-surface-bright/30">
                      <td className="px-4 py-3 text-secondary">{cookie.domain}</td>
                      <td className="px-4 py-3 text-primary">{cookie.name}</td>
                      <td className="px-4 py-3 text-on-surface-variant truncate max-w-[150px]">{cookie.value}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{cookie.path || '/'}</td>
                      <td className="px-4 py-3 text-on-surface-variant opacity-50">
                        {cookie.expires > 0 ? new Date(cookie.expires * 1000).toLocaleDateString() : 'Session'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

export default CookiesManager
