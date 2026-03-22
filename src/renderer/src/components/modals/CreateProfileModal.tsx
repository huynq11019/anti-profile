import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { Profile } from '@shared/types'

const COMMON_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.122 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.111 Safari/537.36'
]

const TIMEZONE_OPTIONS = [
  'UTC',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Ho_Chi_Minh',
  'Asia/Singapore',
  'Asia/Tokyo'
]

export interface CreateProfileFormData {
  id?: string
  name: string
  browserCore?: string
  proxyId?: string
  userAgent?: string
  timezone?: string
  tags?: string
  note?: string
}

interface CreateProfileModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly initialProfile?: Profile | null
  readonly onSubmit?: (data: CreateProfileFormData) => Promise<void> | void
}

export const CreateProfileModal: React.FC<CreateProfileModalProps> = ({
  isOpen,
  onClose,
  initialProfile,
  onSubmit,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null)
  const isEditing = Boolean(initialProfile?.id)
  const [userAgent, setUserAgent] = useState('')
  const [timezone, setTimezone] = useState('UTC')

  useEffect(() => {
    if (!isOpen) return
    setUserAgent(initialProfile?.userAgent ?? '')
    setTimezone(initialProfile?.timezone ?? 'UTC')
  }, [isOpen, initialProfile])

  const defaultTags = useMemo(() => initialProfile?.tags?.join(', ') ?? '', [initialProfile])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form)) as unknown as CreateProfileFormData
    if (initialProfile?.id) {
      data.id = initialProfile.id
    }

    Promise.resolve(onSubmit?.(data))
      .then(() => onClose())
      .catch((error) => {
        console.error('Failed to create profile from modal:', error)
      })
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center 
        bg-black/60 backdrop-blur-sm"
    >
      <div
        className="w-[720px] max-h-[90vh] overflow-y-auto bg-surface-container-high 
          border border-outline-variant/20 rounded-lg shadow-[0_0_60px_rgba(0,0,0,0.6)]"
        role="dialog"
        aria-modal="true"
        aria-label="Create Profile"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.05]">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Create New Profile</h2>
            <p className="text-on-surface-variant text-xs mt-0.5">
              {isEditing ? 'Update profile configuration' : 'Configure a new isolated browser identity'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-bright 
              rounded transition-colors"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-8 py-6 grid grid-cols-2 gap-6">
            {/* Profile Name */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Profile Name *
              </label>
              <input
                name="name"
                type="text"
                placeholder="e.g. FB_Account_01"
                defaultValue={initialProfile?.name ?? ''}
                required
                className="w-full bg-surface-container-highest border border-outline-variant/30 
                  rounded px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant
                  focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-glow transition-all"
              />
            </div>

            {/* Browser Type */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Browser Core
              </label>
              <select
                name="browserCore"
                className="w-full bg-surface-container-highest border border-outline-variant/30 
                  rounded px-4 py-2.5 text-sm text-on-surface 
                  focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="chrome-114">Chromium v114 (Recommended)</option>
                <option value="chrome-116">Chromium v116</option>
                <option value="firefox">Firefox ESR</option>
              </select>
            </div>

            {/* Proxy */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Proxy
              </label>
              <select
                name="proxyId"
                defaultValue={initialProfile?.proxyId ?? ''}
                className="w-full bg-surface-container-highest border border-outline-variant/30 
                  rounded px-4 py-2.5 text-sm text-on-surface 
                  focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="">— No Proxy (Direct) —</option>
                <option value="proxy-us">US-NYC-Static-01 (HTTP)</option>
                <option value="proxy-vn">VN-HCM-Resi-99 (SOCKS5)</option>
                <option value="proxy-de">DE-Berlin-Datacenter (HTTP)</option>
              </select>
            </div>

            {/* User Agent */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                User Agent
              </label>
              <div className="flex gap-2">
                <input
                  name="userAgent"
                  type="text"
                  value={userAgent}
                  onChange={(event) => setUserAgent(event.target.value)}
                  placeholder="Auto-generate from fingerprint seed..."
                  className="flex-1 bg-surface-container-highest border border-outline-variant/30 
                    rounded px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant
                    focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = COMMON_USER_AGENTS[Math.floor(Math.random() * COMMON_USER_AGENTS.length)]
                    setUserAgent(next)
                  }}
                  className="btn-secondary text-sm flex items-center gap-1.5 shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">shuffle</span>
                  Randomize
                </button>
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Timezone
              </label>
              <select
                name="timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="w-full bg-surface-container-highest border border-outline-variant/30 
                  rounded px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant
                  focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Tags
              </label>
              <input
                name="tags"
                type="text"
                defaultValue={defaultTags}
                placeholder="facebook, shopee, ads (comma-separated)"
                className="w-full bg-surface-container-highest border border-outline-variant/30 
                  rounded px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant
                  focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Notes
              </label>
              <textarea
                name="note"
                rows={3}
                defaultValue={initialProfile?.note ?? ''}
                placeholder="Optional notes about this profile..."
                className="w-full bg-surface-container-highest border border-outline-variant/30 
                  rounded px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant resize-none
                  focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-white/[0.05]">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-sm px-6"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary text-sm px-6">
              {isEditing ? 'Save Changes' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateProfileModal
