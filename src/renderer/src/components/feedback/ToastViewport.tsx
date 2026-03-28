import React, { useEffect, useMemo, useState } from 'react'
import { APP_TOAST_EVENT, type ToastEventDetail, type ToastVariant } from '@renderer/utils/errorHandler'

interface ToastItem {
  id: string
  title: string
  message?: string
  variant: ToastVariant
  durationMs: number
}

function variantClasses(variant: ToastVariant): string {
  if (variant === 'success') {
    return 'border-tertiary/40 bg-tertiary/10 text-tertiary'
  }

  if (variant === 'warning') {
    return 'border-secondary/40 bg-secondary/10 text-secondary'
  }

  if (variant === 'info') {
    return 'border-primary/40 bg-primary/10 text-primary'
  }

  return 'border-error/40 bg-error/10 text-error'
}

function variantIcon(variant: ToastVariant): string {
  if (variant === 'success') {
    return 'check_circle'
  }

  if (variant === 'warning') {
    return 'warning'
  }

  if (variant === 'info') {
    return 'info'
  }

  return 'error'
}

export const ToastViewport: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<ToastEventDetail>
      const detail = customEvent.detail
      const nextToast: ToastItem = {
        id: detail.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: detail.title,
        message: detail.message,
        variant: detail.variant ?? 'info',
        durationMs: detail.durationMs ?? 3600
      }

      setToasts((prev) => [...prev, nextToast])
    }

    window.addEventListener(APP_TOAST_EVENT, listener)
    return () => {
      window.removeEventListener(APP_TOAST_EVENT, listener)
    }
  }, [])

  useEffect(() => {
    if (toasts.length === 0) {
      return
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id))
      }, toast.durationMs)
    )

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [toasts])

  const visibleToasts = useMemo(() => toasts.slice(-4), [toasts])

  if (visibleToasts.length === 0) {
    return null
  }

  return (
    <div className="fixed top-[76px] right-4 z-[140] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 pointer-events-none">
      {visibleToasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-lg border px-3 py-2 shadow-2xl backdrop-blur-sm ${variantClasses(toast.variant)}`}
        >
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] mt-[1px]">{variantIcon(toast.variant)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-5">{toast.title}</p>
              {toast.message && <p className="text-[11px] text-on-surface-variant leading-4 mt-0.5">{toast.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
              className="text-on-surface-variant hover:text-on-surface"
              aria-label="Dismiss notification"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ToastViewport
