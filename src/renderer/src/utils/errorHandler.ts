export type ToastVariant = 'info' | 'success' | 'warning' | 'error'

export interface ToastEventDetail {
  id?: string
  title: string
  message?: string
  variant?: ToastVariant
  durationMs?: number
  dedupeKey?: string
  dedupeWindowMs?: number
}

export const APP_TOAST_EVENT = 'app:toast'
const DEFAULT_TOAST_DEDUPE_WINDOW_MS = 2200
const recentToastTimestamps = new Map<string, number>()

export interface HandleIpcErrorOptions {
  title?: string
  fallbackMessage?: string
  variant?: ToastVariant
  silent?: boolean
  context?: string
  durationMs?: number
  dedupeKey?: string
  dedupeWindowMs?: number
}

export interface IpcActionOptions extends HandleIpcErrorOptions {
  onError?: (message: string, error: unknown) => void
}

export interface IpcResultLike {
  success: boolean
  error?: string
  errors?: string[]
}

export function getErrorMessage(error: unknown, fallbackMessage = 'Unexpected error.'): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  return fallbackMessage
}

export function emitToast(detail: ToastEventDetail): void {
  const variant = detail.variant ?? 'info'
  const dedupeWindowMs = Math.max(0, detail.dedupeWindowMs ?? DEFAULT_TOAST_DEDUPE_WINDOW_MS)
  const dedupeKey =
    detail.dedupeKey?.trim() ||
    `${variant}|${detail.title.trim()}|${(detail.message ?? '').trim()}`

  if (dedupeWindowMs > 0) {
    const now = Date.now()
    const previousTimestamp = recentToastTimestamps.get(dedupeKey)
    if (previousTimestamp !== undefined && now - previousTimestamp < dedupeWindowMs) {
      return
    }

    recentToastTimestamps.set(dedupeKey, now)

    for (const [key, timestamp] of recentToastTimestamps.entries()) {
      if (now - timestamp > dedupeWindowMs * 2) {
        recentToastTimestamps.delete(key)
      }
    }
  }

  window.dispatchEvent(new CustomEvent<ToastEventDetail>(APP_TOAST_EVENT, { detail }))
}

export function handleIpcError(error: unknown, options?: HandleIpcErrorOptions): string {
  const message = getErrorMessage(error, options?.fallbackMessage ?? 'IPC request failed.')
  const title = options?.title ?? 'Action failed'

  if (options?.context) {
    console.error(`[IPC:${options.context}] ${message}`, error)
  } else {
    console.error('[IPC]', message, error)
  }

  if (!options?.silent) {
    emitToast({
      title,
      message,
      variant: options?.variant ?? 'error',
      durationMs: options?.durationMs,
      dedupeKey: options?.dedupeKey,
      dedupeWindowMs: options?.dedupeWindowMs
    })
  }

  return message
}

export function ensureIpcSuccess<T extends IpcResultLike>(
  result: T,
  fallbackMessage = 'IPC request failed.'
): T {
  if (result.success) {
    return result
  }

  const bulkErrors = result.errors?.filter(Boolean).join(', ')
  const message = bulkErrors || result.error || fallbackMessage
  throw new Error(message)
}

export async function runIpcAction<T>(
  action: () => Promise<T>,
  options?: IpcActionOptions
): Promise<T | null> {
  try {
    return await action()
  } catch (error) {
    const message = handleIpcError(error, options)
    options?.onError?.(message, error)
    return null
  }
}
