import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useCallback, useRef } from 'react'

import type { ListSortDirection } from '@/lib/list-table'
import { clampColumnWidth } from '@/lib/list-table'
import { cn } from '@/lib/utils'

type ResizableTableHeadCellProps = {
  label: string
  width: number
  className?: string
  sortable?: boolean
  sortDirection?: ListSortDirection | null
  onSort?: () => void
  onResize: (width: number) => void
}

export function ResizableTableHeadCell({
  label,
  width,
  className,
  sortable = false,
  sortDirection = null,
  onSort,
  onResize,
}: ResizableTableHeadCellProps) {
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const handleResizeStart = useCallback(
    (clientX: number) => {
      resizeRef.current = { startX: clientX, startWidth: width }

      const onMove = (event: MouseEvent) => {
        if (!resizeRef.current) return
        const delta = event.clientX - resizeRef.current.startX
        onResize(clampColumnWidth(resizeRef.current.startWidth + delta))
      }

      const onUp = () => {
        resizeRef.current = null
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [onResize, width],
  )

  const SortIcon =
    sortDirection === 'asc'
      ? ArrowUp
      : sortDirection === 'desc'
        ? ArrowDown
        : ArrowUpDown

  return (
    <th
      className={cn(
        'relative px-4 py-3 font-semibold text-foreground',
        className,
      )}
      style={{ width, minWidth: width, maxWidth: width }}
    >
      {sortable && onSort ? (
        <button
          type="button"
          className="inline-flex max-w-full items-center gap-1.5 truncate hover:text-primary"
          onClick={onSort}
        >
          <span className="truncate">{label}</span>
          <SortIcon
            aria-hidden
            className={cn(
              'size-3.5 shrink-0',
              sortDirection ? 'text-primary' : 'text-muted-foreground',
            )}
          />
        </button>
      ) : (
        <span className="block truncate">{label}</span>
      )}

      <button
        type="button"
        aria-label={`Redimensionar columna ${label}`}
        className="absolute end-0 top-0 z-10 h-full w-2 cursor-col-resize touch-none border-e border-transparent hover:border-primary/40"
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleResizeStart(e.clientX)
        }}
        onDoubleClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onResize(clampColumnWidth(width + 40))
        }}
      />
    </th>
  )
}
