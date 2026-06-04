import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatLargeCount } from '@/lib/large-dataset-view'

type SegmentsListPaginationProps = {
  total: number
  rangeFrom: number
  rangeTo: number
  page: number
  totalPages: number
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  entityLabel: string
}

export function SegmentsListPagination({
  total,
  rangeFrom,
  rangeTo,
  page,
  totalPages,
  canPrev,
  canNext,
  onPrev,
  onNext,
  entityLabel,
}: SegmentsListPaginationProps) {
  if (total === 0) return null

  return (
    <footer className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Mostrando{' '}
        <span className="font-medium text-foreground">
          {formatLargeCount(rangeFrom)}–{formatLargeCount(rangeTo)}
        </span>{' '}
        de <span className="font-medium text-foreground">{formatLargeCount(total)}</span>{' '}
        {entityLabel}
        {totalPages > 1 ? (
          <span className="text-muted-foreground">
            {' '}
            · Página {page + 1} de {totalPages}
          </span>
        ) : null}
      </p>
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canPrev}
            onClick={onPrev}
            aria-label="Página anterior"
          >
            <ChevronLeft aria-hidden className="size-4" />
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canNext}
            onClick={onNext}
            aria-label="Página siguiente"
          >
            Siguiente
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
      ) : null}
    </footer>
  )
}
