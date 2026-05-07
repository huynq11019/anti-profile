/// <reference path="../../../shared/types/window.d.ts" />
import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Profile, ProfileExtensionRecord } from '../../../shared/types'
import { emitToast, ensureIpcSuccess, runIpcAction } from '../utils/errorHandler'

export const ExtensionsManager: React.FC = () => {
  const [searchParams] = useSearchParams()
  const requestedProfileId = (searchParams.get('profileId') ?? '').trim()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [extensions, setExtensions] = useState<ProfileExtensionRecord[]>([])
  const [unpackedPath, setUnpackedPath] = useState('')
  const [crxPath, setCrxPath] = useState('')
  const [webstoreUrl, setWebstoreUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [installMethod, setInstallMethod] = useState<'unpacked' | 'crx' | 'webstore'>('webstore')

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  )

  const filteredProfiles = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase()
    if (!keyword) return profiles
    return profiles.filter((p) => p.name.toLowerCase().includes(keyword))
  }, [profiles, searchQuery])

  const stats = useMemo(() => {
    const total = extensions.length
    const enabled = extensions.filter((e) => e.enabled).length
    const disabled = total - enabled
    return { total, enabled, disabled }
  }, [extensions])

  const loadProfiles = async () => {
    const fetched = await runIpcAction(() => window.api.profiles.getAll(), {
      title: 'Unable to load profiles',
      fallbackMessage: 'Failed to load profiles.',
      context: 'extensions.loadProfiles',
      onError: (message) => setError(message)
    })

    if (fetched) {
      setProfiles(fetched)
      setSelectedProfileId((prev) => {
        const hasRequestedProfile = requestedProfileId.length > 0 && fetched.some((profile) => profile.id === requestedProfileId)
        if (hasRequestedProfile) {
          return requestedProfileId
        }

        const hasCurrentProfile = prev.length > 0 && fetched.some((profile) => profile.id === prev)
        if (hasCurrentProfile) {
          return prev
        }

        return fetched[0]?.id || ''
      })
      return
    }

    setProfiles([])
    setSelectedProfileId('')
  }

  const loadExtensions = async (profileId: string) => {
    if (!profileId) {
      setExtensions([])
      return
    }

    setIsLoading(true)
    setError(null)
    const items = await runIpcAction(() => window.api.extensions.list(profileId), {
      title: 'Unable to load extensions',
      fallbackMessage: 'Failed to load extensions.',
      context: 'extensions.load',
      onError: (message) => setError(message)
    })

    if (items) {
      setExtensions(items)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    void loadProfiles()
  }, [requestedProfileId])

  useEffect(() => {
    void loadExtensions(selectedProfileId)
  }, [selectedProfileId])

  const runAction = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    const result = await runIpcAction(async () => {
      setError(null)
      ensureIpcSuccess(await action(), 'Extension action failed.')

      await loadExtensions(selectedProfileId)
      return true
    }, {
      title: 'Extension action failed',
      fallbackMessage: 'Unable to complete extension action.',
      context: 'extensions.action',
      onError: (message) => setError(message)
    })

    if (result) {
      emitToast({ title: 'Extension updated', variant: 'success' })
      return true
    }

    return false
  }

  const onInstallUnpacked = async () => {
    if (!selectedProfileId || !unpackedPath.trim()) return

    const ok = await runAction(() => window.api.extensions.installUnpacked(selectedProfileId, unpackedPath.trim()))
    if (ok) {
      setUnpackedPath('')
    }
  }

  const onInstallCrx = async () => {
    if (!selectedProfileId || !crxPath.trim()) return

    const ok = await runAction(() => window.api.extensions.installCrx(selectedProfileId, crxPath.trim()))
    if (ok) {
      setCrxPath('')
    }
  }

  const onInstallWebstore = async () => {
    if (!selectedProfileId || !webstoreUrl.trim()) return

    const ok = await runAction(() => window.api.extensions.installWebstore(selectedProfileId, webstoreUrl.trim()))
    if (ok) {
      setWebstoreUrl('')
    }
  }

  const onToggle = async (record: ProfileExtensionRecord, enabled: boolean) => {
    await runAction(() => window.api.extensions.toggle(selectedProfileId, record.id, enabled))
  }

  const onRemove = async (record: ProfileExtensionRecord) => {
    await runAction(() => window.api.extensions.remove(selectedProfileId, record.id))
  }

  const handleInstall = () => {
    if (installMethod === 'unpacked') {
      void onInstallUnpacked()
    } else if (installMethod === 'crx') {
      void onInstallCrx()
    } else {
      void onInstallWebstore()
    }
  }

  const getInstallValue = () => {
    if (installMethod === 'unpacked') return unpackedPath
    if (installMethod === 'crx') return crxPath
    return webstoreUrl
  }

  const setInstallValue = (val: string) => {
    if (installMethod === 'unpacked') setUnpackedPath(val)
    else if (installMethod === 'crx') setCrxPath(val)
    else setWebstoreUrl(val)
  }

  const getPlaceholder = () => {
    if (installMethod === 'unpacked') return '/path/to/unpacked/extension/directory'
    if (installMethod === 'crx') return '/path/to/extension.crx'
    return 'https://chromewebstore.google.com/detail/extension-name/...'
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
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Extensions Manager</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Install, enable, and manage browser extensions per profile
          </p>
        </div>

        <div className="flex gap-4">
          {[
            { label: 'Installed', value: stats.total.toString(), color: 'on-surface' },
            { label: 'Enabled', value: stats.enabled.toString(), color: 'tertiary', dot: stats.enabled > 0 },
            { label: 'Disabled', value: stats.disabled.toString(), color: 'on-surface-variant' },
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
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold text-${stat.color} leading-none`}>
                  {stat.value}
                </span>
                {stat.dot && <span className="w-2 h-2 rounded-full bg-tertiary" />}
              </div>
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                    <span className="material-symbols-outlined text-[12px]">extension</span>
                    {isSelected ? `${extensions.length} extensions` : 'Click to manage'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Pane — Extension Management */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-surface">
          {/* Install Section */}
          <div className="p-6 border-b border-white/[0.05] shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-on-surface">Install Extension</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Target: <span className="text-primary font-semibold">{selectedProfile?.name ?? 'None selected'}</span>
                  {selectedProfile?.status === 'running' && (
                    <span className="ml-2 text-[10px] text-error font-medium bg-error/10 px-1.5 py-0.5 rounded border border-error/20">
                      Stop profile before changing extensions
                    </span>
                  )}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            {/* Install Method Tabs */}
            <div className="flex gap-1 mb-4 bg-surface-container-highest/50 p-1 rounded-lg w-fit">
              {[
                { key: 'webstore' as const, label: 'Web Store URL', icon: 'store' },
                { key: 'crx' as const, label: 'CRX File', icon: 'inventory_2' },
                { key: 'unpacked' as const, label: 'Unpacked', icon: 'folder_open' },
              ].map((method) => (
                <button
                  key={method.key}
                  onClick={() => setInstallMethod(method.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    installMethod === method.key
                      ? 'bg-primary/20 text-primary'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{method.icon}</span>
                  {method.label}
                </button>
              ))}
            </div>

            {/* Install Input */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                  {installMethod === 'webstore' ? 'link' : installMethod === 'crx' ? 'description' : 'folder'}
                </span>
                <input
                  value={getInstallValue()}
                  onChange={(e) => setInstallValue(e.target.value)}
                  placeholder={getPlaceholder()}
                  className="w-full bg-surface-container-highest border border-outline-variant/20
                    focus:ring-1 focus:ring-primary/30 rounded-lg pl-10 pr-4 py-2.5 text-sm text-on-surface
                    placeholder:text-on-surface-variant/60"
                />
              </div>
              <button
                onClick={handleInstall}
                disabled={!selectedProfileId || !getInstallValue().trim()}
                className="btn-primary flex items-center gap-1.5 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Install
              </button>
            </div>
          </div>

          {/* Installed Extensions List */}
          <div className="flex-1 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-on-surface uppercase tracking-widest">
                Installed Extensions ({extensions.length})
              </h2>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-[32px] animate-spin mr-3">progress_activity</span>
                <span className="text-sm">Loading extensions...</span>
              </div>
            )}

            {!isLoading && extensions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="material-symbols-outlined text-[48px] text-primary opacity-20">extension_off</span>
                <p className="text-sm text-on-surface-variant">No extensions installed for this profile.</p>
                <p className="text-xs text-on-surface-variant/60">Use the install section above to add extensions.</p>
              </div>
            )}

            <div className="space-y-3">
              {extensions.map((record) => (
                <div
                  key={record.id}
                  className="group bg-surface-container-low rounded-lg border border-outline-variant/10
                    hover:border-outline-variant/25 transition-colors overflow-hidden"
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Extension Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      record.enabled
                        ? 'bg-primary/10 border border-primary/20'
                        : 'bg-surface-container-highest border border-outline-variant/20'
                    }`}>
                      <span className={`material-symbols-outlined text-[20px] ${
                        record.enabled ? 'text-primary' : 'text-on-surface-variant/40'
                      }`}>
                        extension
                      </span>
                    </div>

                    {/* Extension Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-on-surface truncate">
                          {record.extensionName}
                        </p>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          record.source === 'webstore'
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : record.source === 'crx'
                              ? 'bg-[#ffb74d]/10 text-[#ffb74d] border-[#ffb74d]/20'
                              : 'bg-surface-container-highest text-on-surface-variant border-outline-variant/20'
                        }`}>
                          {record.source}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant/70 font-mono truncate">
                        {record.extensionPath}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => void onToggle(record, !record.enabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          record.enabled ? 'bg-primary' : 'bg-surface-container-highest'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                            record.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>

                      <button
                        onClick={() => void onRemove(record)}
                        className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-md transition-colors
                          opacity-0 group-hover:opacity-100"
                        aria-label="Remove extension"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExtensionsManager
