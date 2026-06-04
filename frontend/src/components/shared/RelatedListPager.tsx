import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { RelatedListPageSize } from '@/lib/use-related-list-state'
import { cn } from '@/lib/utils'

type RelatedListPagerProps = {
  rangeStart: number
  rangeEnd: number
  total: number
  page: number
  pageCount: number
  pageSize: RelatedListPageSize
  pageSizeOptions?: RelatedListPageSize[]
  onPageChange: (page: number) => void
  onPageSizeChange: (size: RelatedListPageSize) => void
}

export function RelatedListPager({
  rangeStart,
  rangeEnd,
  total,
  page,
  pageCount,
  pageSize,
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
}: RelatedListPagerProps) {
  if (total <= pageSize) return null

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground tabular-nums">
        Mostrando {rangeStart}–{rangeEnd} de {total}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page <= 1}
          aria-label="Página anterior"
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>
        <span className="min-w-[4rem] text-center text-xs font-medium tabular-nums">
          {page} / {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page >= pageCount}
          aria-label="Página siguiente"
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight aria-hidden className="size-4" />
        </Button>
        <select
          aria-label="Registros por página"
          value={pageSize}
          className={cn(
            'h-8 rounded-md border border-border bg-background px-2 text-xs shadow-sm outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring',
          )}
          onChange={(e) => onPageSizeChange(Number(e.target.value) as RelatedListPageSize)}
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n} por página
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
