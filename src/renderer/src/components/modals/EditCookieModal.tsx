import React, { useEffect, useRef, useState } from 'react'
import type { CookieRecord, SameSitePolicy } from '../../../../shared/types'
import { handleIpcError, emitToast } from '../../utils/errorHandler'

interface EditCookieModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly cookie: CookieRecord | null
  readonly profileId: string
  readonly onSuccess?: () => Promise<void> | void
}

export const EditCookieModal: React.FC<EditCookieModalProps> = ({
  isOpen,
  onClose,
  cookie,
  profileId,
  onSuccess
}) => {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    domain: '',
    path: '/',
    expires: 0,
    secure: false,
    httpOnly: false,
    sameSite: undefined as SameSitePolicy
  })

  useEffect(() => {
    if (!isOpen || !cookie) return
    setFormData({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
      expires: cookie.expires,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite
    })
  }, [isOpen, cookie])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen || !cookie) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await (window as any).api.cookies.edit({
        profileId,
        domain: cookie.domain,
        oldName: cookie.name,
        newCookie: formData
      })

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to edit cookie')
      }

      emitToast({
        title: 'Cookie updated',
        message: `${formData.name} has been updated.`,
        variant: 'success'
      })

      await Promise.resolve(onSuccess?.())
      onClose()
    } catch (error) {
      handleIpcError(error, {
        title: 'Cookie edit failed',
        fallbackMessage: 'Unable to edit cookie.',
        context: 'modal.cookieEdit',
        silent: false
      })
    } finally {
      setIsLoading(false)
    }
  }

  const expiresDate = formData.expires > 0 
    ? new Date(formData.expires * 1000).toISOString().split('T')[0]
    : ''

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        className="w-[600px] max-h-[90vh] overflow-y-auto bg-surface-container-high 
          border border-outline-variant/20 rounded-lg shadow-[0_0_60px_rgba(0,0,0,0.6)]"
        role="dialog"
        aria-modal="true"
        aria-label="Edit Cookie"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.05]">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Edit Cookie</h2>
            <p className="text-on-surface-variant text-xs mt-0.5">
              Modify cookie properties for {cookie.domain}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-bright 
              rounded transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-8 py-6 space-y-6">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Cookie Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. session_id"
                required
                className="w-full bg-surface-container-highest border border-outline-variant/30 
                  rounded px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant
                  focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-glow transition-all"
              />
            </div>

            {/* Value */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Cookie Value *
              </label>
              <textarea
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="e.g. abc123xyz..."
                required
                rows={3}
                className="w-full bg-surface-container-highest border border-outline-variant/30 
                  rounded px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant
                  focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-glow transition-all resize-none"
              />
            </div>

            {/* Domain */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Domain (Read-only)
              </label>
              <input
                type="text"
                value={formData.domain}
                disabled
                className="w-full bg-surface-container-highest border border-outline-variant/30 
                  rounded px-4 py-2.5 text-sm text-on-surface-variant opacity-60 cursor-not-allowed"
              />
              <p className="text-xs text-on-surface-variant/70 mt-1">
                Domain cannot be changed. Delete and re-add the cookie if you need a different domain.
              </p>
            </div>

            {/* Path */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Path
              </label>
              <input
                type="text"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value || '/' })}
                placeholder="/"
                className="w-full bg-surface-container-highest border border-outline-variant/30 
                  rounded px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant
                  focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-glow transition-all"
              />
            </div>

            {/* Expires */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Expiry Date (leave empty for session cookie)
              </label>
              <input
                type="date"
                value={expiresDate}
                onChange={(e) => {
                  if (!e.target.value) {
                    setFormData({ ...formData, expires: 0 })
                  } else {
                    const timestamp = Math.floor(new Date(e.target.value).getTime() / 1000)
                    setFormData({ ...formData, expires: timestamp })
                  }
                }}
                className="w-full bg-surface-container-highest border border-outline-variant/30 
                  rounded px-4 py-2.5 text-sm text-on-surface
                  focus:outline-none focus:ring-1 focus:ring-primary focus:shadow-glow transition-all"
              />
            </div>

            {/* Security Options */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.secure}
                  onChange={(e) => setFormData({ ...formData, secure: e.target.checked })}
                  className="w-4 h-4 rounded border-outline-variant/30 text-primary cursor-pointer"
                />
                <span className="text-sm text-on-surface-variant">Secure (HTTPS only)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.httpOnly}
                  onChange={(e) => setFormData({ ...formData, httpOnly: e.target.checked })}
                  className="w-4 h-4 rounded border-outline-variant/30 text-primary cursor-pointer"
                />
                <span className="text-sm text-on-surface-variant">HttpOnly</span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                  SameSite
                </label>
                <select
                  value={formData.sameSite ?? ''}
                  onChange={(e) => {
                    const value = e.target.value as SameSitePolicy
                    setFormData({ ...formData, sameSite: value || undefined })
                  }}
                  className="w-full bg-surface-container-highest border border-outline-variant/30 
                    rounded px-3 py-2 text-sm text-on-surface
                    focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                >
                  <option value="">None</option>
                  <option value="Strict">Strict</option>
                  <option value="Lax">Lax</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-white/[0.05]">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-2 rounded text-sm font-medium text-on-surface-variant 
                hover:bg-surface-bright/30 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 rounded text-sm font-medium bg-primary text-on-primary 
                hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <span className="animate-spin material-symbols-outlined text-[16px]">hourglass_top</span>}
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
