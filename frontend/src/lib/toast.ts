export type ToastVariant = 'success' | 'warning' | 'error'

export type ToastItem = {
  id: string
  message: string
  variant: ToastVariant
}

type Listener = () => void

const DEFAULT_DURATION_MS = 5000
const MAX_VISIBLE = 5

let toasts: ToastItem[] = []
const listeners = new Set<Listener>()
const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>()

function notify() {
  listeners.forEach((listener) => listener())
}

function scheduleDismiss(id: string, durationMs: number) {
  const existing = dismissTimers.get(id)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(() => {
    dismissTimers.delete(id)
    dismiss(id)
  }, durationMs)
  dismissTimers.set(id, timer)
}

function push(message: string, variant: ToastVariant, durationMs = DEFAULT_DURATION_MS) {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  toasts = [...toasts.slice(-(MAX_VISIBLE - 1)), { id, message, variant }]
  notify()
  if (durationMs > 0) scheduleDismiss(id, durationMs)
  return id
}

export function dismiss(id: string) {
  const timer = dismissTimers.get(id)
  if (timer) {
    clearTimeout(timer)
    dismissTimers.delete(id)
  }
  const next = toasts.filter((t) => t.id !== id)
  if (next.length === toasts.length) return
  toasts = next
  notify()
}

export function getToasts(): readonly ToastItem[] {
  return toasts
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const toast = {
  success: (message: string, durationMs?: number) => push(message, 'success', durationMs),
  warning: (message: string, durationMs?: number) => push(message, 'warning', durationMs),
  error: (message: string, durationMs?: number) => push(message, 'error', durationMs),
  dismiss,
}
