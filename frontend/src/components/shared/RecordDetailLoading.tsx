import { Loader2 } from 'lucide-react'

export function RecordDetailLoading() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center"
      role="status"
      aria-live="polite"
    >
      <Loader2 aria-hidden className="size-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Cargando registro…</p>
    </div>
  )
}
