import { AlertTriangle, CheckCircle2, CircleAlert, X } from 'lucide-react'
import { useSyncExternalStore } from 'react'

import { dismiss, getToasts, subscribeToasts, type ToastVariant } from '@/lib/toast'
import { cn } from '@/lib/utils'

const variantStyles: Record<
  ToastVariant,
  { container: string; icon: string; dismiss: string }
> = {
  success: {
    container:
      'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-emerald-200/40 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-50',
    icon: 'text-emerald-600 dark:text-emerald-400',
    dismiss: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/60',
  },
  warning: {
    container:
      'border-amber-300 bg-amber-50 text-amber-950 shadow-amber-200/40 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-50',
    icon: 'text-amber-600 dark:text-amber-400',
    dismiss: 'hover:bg-amber-100 dark:hover:bg-amber-900/60',
  },
  error: {
    container:
      'border-red-300 bg-red-50 text-red-950 shadow-red-200/40 dark:border-red-800 dark:bg-red-950/80 dark:text-red-50',
    icon: 'text-red-600 dark:text-red-400',
    dismiss: 'hover:bg-red-100 dark:hover:bg-red-900/60',
  },
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const className = cn('size-4 shrink-0', variantStyles[variant].icon)
  if (variant === 'success') return <CheckCircle2 aria-hidden className={className} />
  if (variant === 'warning') return <AlertTriangle aria-hidden className={className} />
  return <CircleAlert aria-hidden className={className} />
}

export function Toaster() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, getToasts)

  if (items.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 p-0 sm:bottom-6 sm:right-6"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((item) => {
        const styles = variantStyles[item.variant]
        return (
          <div
            key={item.id}
            role={item.variant === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg',
              styles.container,
            )}
          >
            <ToastIcon variant={item.variant} />
            <p className="min-w-0 flex-1 leading-snug">{item.message}</p>
            <button
              type="button"
              className={cn('shrink-0 rounded-md p-1', styles.dismiss)}
              aria-label="Cerrar notificación"
              onClick={() => dismiss(item.id)}
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
