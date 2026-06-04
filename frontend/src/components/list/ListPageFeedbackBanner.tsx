import { CheckCircle2, X } from 'lucide-react'

type ListPageFeedbackBannerProps = {
  message: string
  onDismiss: () => void
}

export function ListPageFeedbackBanner({
  message,
  onDismiss,
}: ListPageFeedbackBannerProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
      role="status"
    >
      <span className="flex items-center gap-2">
        <CheckCircle2 aria-hidden className="size-4 shrink-0" />
        {message}
      </span>
      <button
        type="button"
        className="rounded-md p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
        aria-label="Cerrar aviso"
        onClick={onDismiss}
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  )
}
