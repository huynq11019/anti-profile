import React from 'react'
import { Profile, Proxy } from '@shared/types'
import { ProfileRow } from '@renderer/components/profiles/ProfileRow'
import { useDashboard } from '@renderer/hooks/useDashboard'

type BulkAction = 'open' | 'close' | 'assignProxy' | 'removeProxy' | 'assignProxyMap'

interface ProfilesProps {
  readonly onCreateProfile?: () => void
  readonly onEditProfile?: (profile: Profile) => void
}

export const Profiles: React.FC<ProfilesProps> = ({ onCreateProfile, onEditProfile }) => {
  const [bulkAction, setBulkAction] = React.useState<BulkAction>('open')
  const [allProxies, setAllProxies] = React.useState<Proxy[]>([])
  const [showProxyMapModal, setShowProxyMapModal] = React.useState(false)
  const [proxyMapDraft, setProxyMapDraft] = React.useState<Record<string, string | undefined>>({})
  const [currentPage, setCurrentPage] = React.useState(1)

  const itemsPerPage = 10

  const {
    profiles,
    allProfiles,
    isLoading,
    error,
    selectedIds,
    searchQuery,
    setSearchQuery,
    handleSelect,
    handleLaunch,
    handleStop,
    handleDelete,
    handleTogglePin,
    handleOpenFolder,
    handleExportZip,
    handleBulkOpen,
    handleBulkClose,
    handleBulkAssignProxy,
    handleBulkAssignProxyMap,
    clearSelection,
  } = useDashboard()

  const selectedProfileIds = React.useMemo(() => Array.from(selectedIds), [selectedIds])
  const selectedProfiles = React.useMemo(
    () => allProfiles.filter((profile) => selectedIds.has(profile.id)),
    [allProfiles, selectedIds]
  )

  const totalPages = Math.max(1, Math.ceil(profiles.length / itemsPerPage))

  const safeCurrentPage = React.useMemo(() => {
    if (currentPage < 1) return 1
    if (currentPage > totalPages) return totalPages
    return currentPage
  }, [currentPage, totalPages])

  const paginatedProfiles = React.useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage
    return profiles.slice(start, start + itemsPerPage)
  }, [profiles, safeCurrentPage])

  const pageProfileIds = React.useMemo(() => paginatedProfiles.map((profile) => profile.id), [paginatedProfiles])

  const allSelected = pageProfileIds.length > 0 && pageProfileIds.every((id) => selectedIds.has(id))
  const someSelected = pageProfileIds.some((id) => selectedIds.has(id)) && !allSelected

  const pageNumberItems = React.useMemo(() => {
    const maxButtons = 5
    const half = Math.floor(maxButtons / 2)
    let start = Math.max(1, safeCurrentPage - half)
    let end = Math.min(totalPages, start + maxButtons - 1)

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1)
    }

    const pages: number[] = []
    for (let page = start; page <= end; page += 1) {
      pages.push(page)
    }

    return pages
  }, [safeCurrentPage, totalPages])

  React.useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage)
    }
  }, [currentPage, safeCurrentPage])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  React.useEffect(() => {
    const loadDependencies = async () => {
      try {
        const fetchedProxies = await window.api.proxies.getAll()
        setAllProxies(fetchedProxies)
      } catch (err) {
        console.error('Failed to load proxies:', err)
      }
    }

    void loadDependencies()
  }, [])

  const toggleSelectAllOnPage = (checked: boolean) => {
    pageProfileIds.forEach((id) => {
      handleSelect(id, checked)
    })
  }

  const stats = [
    { label: 'Profiles', value: allProfiles.length.toString(), icon: 'person_pin' },
    {
      label: 'Active',
      value: allProfiles.filter((profile) => profile.status === 'running').length.toString(),
      icon: 'play_circle',
      isActive: true
    },
    {
      label: 'With Proxy',
      value: allProfiles.filter((profile) => Boolean(profile.proxyId)).length.toString(),
      icon: 'vpn_lock'
    },
    {
      label: 'Selected',
      value: selectedIds.size.toString(),
      icon: 'check_box'
    }
  ]

  const runProfileAction = async (action: () => Promise<void>) => {
    try {
      await action()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Profile action failed.'
      console.error(message)
      window.alert(message)
    }
  }

  const runBulkAction = async () => {
    if (selectedProfileIds.length === 0) {
      window.alert('Select at least one profile before running a bulk action.')
      return
    }

    await runProfileAction(async () => {
      if (bulkAction === 'open') {
        await handleBulkOpen(selectedProfileIds)
      } else if (bulkAction === 'close') {
        await handleBulkClose(selectedProfileIds)
      } else if (bulkAction === 'assignProxy') {
        const input = window.prompt('Enter proxy id to assign (leave empty to clear proxy):', '')
        if (input === null) {
          return
        }

        const proxyId = input.trim() || undefined
        await handleBulkAssignProxy(selectedProfileIds, proxyId)
      } else if (bulkAction === 'removeProxy') {
        await handleBulkAssignProxy(selectedProfileIds, undefined)
      } else {
        if (allProxies.length === 0) {
          window.alert('No proxies available. Create proxies first in Proxy Manager.')
          return
        }

        const draft: Record<string, string | undefined> = {}
        selectedProfiles.forEach((profile, idx) => {
          const autoProxy = allProxies[idx % allProxies.length]
          draft[profile.id] = autoProxy?.id
        })

        setProxyMapDraft(draft)
        setShowProxyMapModal(true)
        return
      }

      clearSelection()
    })
  }

  const applyProxyMapDraft = async () => {
    await runProfileAction(async () => {
      await handleBulkAssignProxyMap(proxyMapDraft)
      setShowProxyMapModal(false)
      clearSelection()
    })
  }

  const runExportZip = async (profile: Profile) => {
    await runProfileAction(async () => {
      const zipPath = await handleExportZip(profile.id)
      if (zipPath) {
        window.alert(`Profile exported successfully:\n${zipPath}`)
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Hero Section ─────────────────────────────── */}
      <section
        className="flex items-center px-10 h-[160px] border-b border-outline-variant/10 relative overflow-hidden shrink-0"
        style={{ background: 'linear-gradient(135deg, #111318 0%, #0c0e12 100%)' }}
      >
        {/* Decorative glint */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/[0.05] to-transparent pointer-events-none" />

        <div className="flex-1">
          <h1 className="text-2xl font-bold text-on-surface leading-tight">
            Manage your anonymous browser profiles securely
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Anti-fingerprint browser profiles with proxy, cookie and automation control
          </p>
        </div>

        {/* Stat cards */}
        <div className="flex gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-container-high border border-outline-variant/20 
                px-5 py-4 rounded-lg min-w-[130px] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/[0.06] to-transparent" />
              <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-on-surface">{stat.value}</h3>
                {stat.isActive && (
                  <span className="status-dot-active animate-pulse" />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Profiles Section ──────────────────────────── */}
      <section className="flex-1 overflow-auto p-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onCreateProfile}
              className="flex items-center gap-1.5 border border-primary text-primary 
                px-4 py-2 rounded text-sm font-semibold hover:bg-primary/[0.06] transition-colors"
              id="new-profile-btn"
              title="Tạo profile mới"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Profile
            </button>
            <button className="btn-secondary flex items-center gap-1.5 text-sm" title="Nhập profile từ file (đang phát triển)">
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              Import
            </button>
            <div className="relative flex items-center gap-2">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value as BulkAction)}
                className="btn-secondary text-sm h-[36px] pr-8"
              >
                <option value="open">Bulk Open</option>
                <option value="close">Bulk Close</option>
                <option value="assignProxy">Bulk Proxy Assign</option>
                <option value="removeProxy">Bulk Remove Proxy</option>
                <option value="assignProxyMap">Bulk Unique Proxy (Per Account)</option>
              </select>
              <button
                onClick={() => {
                  void runBulkAction()
                }}
                className="btn-secondary flex items-center gap-1.5 text-sm"
                title="Chạy thao tác hàng loạt"
              >
                Run ({selectedProfileIds.length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search profiles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface-container-highest border border-outline-variant/20 
                  rounded-lg pl-9 pr-4 py-2 w-[260px] text-sm text-on-surface placeholder:text-on-surface-variant
                  focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <button className="btn-secondary p-2.5" title="Bộ lọc (đang phát triển)">
              <span className="material-symbols-outlined text-[20px]">filter_alt</span>
            </button>
            <button className="btn-secondary p-2.5" title="Sắp xếp (đang phát triển)">
              <span className="material-symbols-outlined text-[20px]">sort</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-container-low rounded-lg overflow-hidden border border-outline-variant/10 shadow-2xl">
          {error && (
            <div className="px-5 py-3 text-sm text-error border-b border-error/20 bg-error/5">
              Failed to load profiles: {error}
            </div>
          )}

          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-high/50">
              <tr>
                <th className="py-3.5 px-5 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected }}
                    onChange={(e) => toggleSelectAllOnPage(e.target.checked)}
                    className="rounded bg-surface border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface"
                  />
                </th>
                {['Status', 'Profile Name', 'Browser', 'Proxy', 'Fingerprint', 'Tags', 'Last Used', 'Actions'].map((col) => (
                  <th
                    key={col}
                    className={`py-3.5 px-4 text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest ${
                      col === 'Actions' ? 'text-right pr-5' : ''
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-on-surface-variant">
                    Loading profiles...
                  </td>
                </tr>
              )}

              {!isLoading && profiles.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-on-surface-variant">
                    No profiles found. Create your first profile to get started.
                  </td>
                </tr>
              )}

              {paginatedProfiles.map((profile) => (
                <ProfileRow
                  key={profile.id}
                  profile={profile}
                  isSelected={selectedIds.has(profile.id)}
                  onSelect={handleSelect}
                  onLaunch={(id) => {
                    void runProfileAction(() => handleLaunch(id))
                  }}
                  onStop={(id) => {
                    void runProfileAction(() => handleStop(id))
                  }}
                  onEdit={(profile) => onEditProfile?.(profile)}
                  onTogglePin={(id) => {
                    void runProfileAction(() => handleTogglePin(id))
                  }}
                  onOpenFolder={(id) => {
                    void runProfileAction(() => handleOpenFolder(id))
                  }}
                  onExportZip={(profile) => {
                    void runExportZip(profile)
                  }}
                  onDelete={(id) => {
                    void runProfileAction(() => handleDelete(id))
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-5 flex items-center justify-between text-xs text-on-surface-variant">
          <p>
            Showing {profiles.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1}-
            {Math.min(safeCurrentPage * itemsPerPage, profiles.length)} of {profiles.length} profiles
            {profiles.length !== allProfiles.length ? ` (total ${allProfiles.length})` : ''}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="p-2 border border-outline-variant/30 rounded hover:text-on-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {pageNumberItems.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCurrentPage(n)}
                className={`w-8 h-8 rounded font-bold text-xs transition-colors ${
                  n === safeCurrentPage
                    ? 'btn-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="p-2 border border-outline-variant/30 rounded hover:text-on-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </section>

      {showProxyMapModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="w-full max-w-[760px] rounded-lg border border-outline-variant/20 bg-surface-container-high shadow-2xl">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-on-surface">Bulk Unique Proxy Assignment</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Auto-mapped sequentially. You can adjust proxy for each selected profile.
                </p>
              </div>
              <button
                onClick={() => setShowProxyMapModal(false)}
                className="p-1.5 text-on-surface-variant hover:text-on-surface"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="px-6 py-4 max-h-[380px] overflow-y-auto space-y-3">
              {selectedProfiles.map((profile) => (
                <div key={profile.id} className="grid grid-cols-[1fr_280px] items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{profile.name}</p>
                    <p className="text-[11px] text-on-surface-variant">{profile.id}</p>
                  </div>
                  <select
                    value={proxyMapDraft[profile.id] ?? ''}
                    onChange={(event) => {
                      const value = event.target.value || undefined
                      setProxyMapDraft((prev) => ({ ...prev, [profile.id]: value }))
                    }}
                    className="w-full bg-surface-container-highest border border-outline-variant/30 rounded px-3 py-2 text-sm text-on-surface"
                  >
                    <option value="">— No Proxy —</option>
                    {allProxies.map((proxy) => (
                      <option key={proxy.id} value={proxy.id}>
                        {proxy.alias} ({proxy.host}:{proxy.port})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
              <button className="btn-secondary text-sm" onClick={() => setShowProxyMapModal(false)}>
                Cancel
              </button>
              <button className="btn-primary text-sm" onClick={() => void applyProxyMapDraft()}>
                Apply Mapping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profiles
