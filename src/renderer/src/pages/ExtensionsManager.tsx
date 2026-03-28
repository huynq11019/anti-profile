/// <reference path="../../../shared/types/window.d.ts" />
import React, { useEffect, useMemo, useState } from 'react'
import type { Profile, ProfileExtensionRecord } from '../../../shared/types'
import { emitToast, ensureIpcSuccess, runIpcAction } from '../utils/errorHandler'

export const ExtensionsManager: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [extensions, setExtensions] = useState<ProfileExtensionRecord[]>([])
  const [unpackedPath, setUnpackedPath] = useState('')
  const [crxPath, setCrxPath] = useState('')
  const [webstoreUrl, setWebstoreUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  )

  const loadProfiles = async () => {
    const fetched = await runIpcAction(() => window.api.profiles.getAll(), {
      title: 'Unable to load profiles',
      fallbackMessage: 'Failed to load profiles.',
      context: 'extensions.loadProfiles',
      onError: (message) => setError(message)
    })

    if (fetched) {
      setProfiles(fetched)
      setSelectedProfileId((prev) => prev || fetched[0]?.id || '')
    }
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
  }, [])

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

  return (
    <div className="h-full flex flex-col pt-4">
      <div className="px-8 pb-4 border-b border-white/[0.05] shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface mb-1">Extensions Management</h1>
        <p className="text-sm text-on-surface-variant">
          Install by unpacked folder, CRX path, or Chrome Web Store URL. Stop profile before changing extensions.
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
            <h2 className="text-sm font-bold text-on-surface mb-3">Install Extension</h2>
            <p className="text-xs text-on-surface-variant mb-3">Target profile: {selectedProfile?.name ?? 'None selected'}</p>

            <div className="grid grid-cols-[1fr_auto] gap-2 mb-3">
              <input
                value={unpackedPath}
                onChange={(event) => setUnpackedPath(event.target.value)}
                placeholder="Unpacked extension directory path"
                className="bg-surface-container-highest border border-outline-variant/20 rounded px-3 py-2 text-sm"
              />
              <button className="btn-secondary text-sm" onClick={() => void onInstallUnpacked()}>
                Install Unpacked
              </button>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2 mb-3">
              <input
                value={crxPath}
                onChange={(event) => setCrxPath(event.target.value)}
                placeholder="CRX file path"
                className="bg-surface-container-highest border border-outline-variant/20 rounded px-3 py-2 text-sm"
              />
              <button className="btn-secondary text-sm" onClick={() => void onInstallCrx()}>
                Install CRX
              </button>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                value={webstoreUrl}
                onChange={(event) => setWebstoreUrl(event.target.value)}
                placeholder="Chrome Web Store URL"
                className="bg-surface-container-highest border border-outline-variant/20 rounded px-3 py-2 text-sm"
              />
              <button className="btn-primary text-sm" onClick={() => void onInstallWebstore()}>
                Install Web Store URL
              </button>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-lg border border-outline-variant/10 p-4">
            <h2 className="text-sm font-bold text-on-surface mb-3">Installed Extensions ({extensions.length})</h2>
            {isLoading && <p className="text-xs text-on-surface-variant">Loading...</p>}
            {!isLoading && extensions.length === 0 && (
              <p className="text-xs text-on-surface-variant">No extensions installed for selected profile.</p>
            )}
            <div className="space-y-2">
              {extensions.map((record) => (
                <div key={record.id} className="border border-outline-variant/10 rounded p-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{record.extensionName}</p>
                    <p className="text-xs text-on-surface-variant break-all">{record.extensionPath}</p>
                    <p className="text-[11px] text-primary mt-1">Source: {record.source}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className={`px-2 py-1 rounded text-xs ${record.enabled ? 'bg-primary/20 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}
                      onClick={() => void onToggle(record, !record.enabled)}
                    >
                      {record.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      className="p-1.5 text-on-surface-variant hover:text-error"
                      onClick={() => void onRemove(record)}
                      aria-label="Remove extension"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
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
