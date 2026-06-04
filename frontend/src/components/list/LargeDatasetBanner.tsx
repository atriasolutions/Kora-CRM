import { AlertTriangle, List } from 'lucide-react'

import {
  formatLargeCount,
  LARGE_DATASET_WARN_THRESHOLD,
} from '@/lib/large-dataset-view'

type LargeDatasetBannerProps = {
  total: number
  entityLabel: string
  viewMode: 'kanban' | 'segmentos'
}

export function LargeDatasetBanner({
  total,
  entityLabel,
  viewMode,
}: LargeDatasetBannerProps) {
  if (total < LARGE_DATASET_WARN_THRESHOLD) return null

  const viewHint =
    viewMode === 'kanban'
      ? 'Mostramos un número limitado de tarjetas por columna; usa «Cargar más» o cambia a Lista para ver todo con paginación.'
      : 'La lista del segmento está paginada. Para búsquedas masivas o exportar, usa la vista Lista.'

  return (
    <div
      role="status"
      className="flex gap-3 rounded-lg border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50"
    >
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 space-y-1">
        <p className="font-medium">
          {formatLargeCount(total)} {entityLabel} coinciden — vista optimizada
        </p>
        <p className="text-xs leading-relaxed opacity-90">{viewHint}</p>
        <p className="inline-flex items-center gap-1 text-xs font-medium opacity-80">
          <List aria-hidden className="size-3.5" />
          Consejo: acota con búsqueda y filtros antes de recorrer Kanban o Segmentos.
        </p>
      </div>
    </div>
  )
}
