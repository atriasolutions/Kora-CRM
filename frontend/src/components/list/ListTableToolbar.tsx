import { ArrowDown, ArrowUp, Check, ChevronDown, Download, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type ListTableColumnOption = {
  key: string
  header: string
  visible: boolean
  /** Columnas que no pueden ocultarse (p. ej. Nombre). */
  locked?: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
}

type ListTableToolbarProps = {
  columns: ListTableColumnOption[]
  onToggleColumn: (key: string) => void
  onMoveColumn: (key: string, direction: 'up' | 'down') => void
  onResetColumns: () => void
  onExport: () => void
  exportDisabled?: boolean
  exportLabel?: string
}

export function ListTableToolbar({
  columns,
  onToggleColumn,
  onMoveColumn,
  onResetColumns,
  onExport,
  exportDisabled = false,
  exportLabel = 'Descargar exportación',
}: ListTableToolbarProps) {
  const hiddenCount = columns.filter((c) => !c.visible).length

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'border-border shadow-sm',
              hiddenCount > 0 && 'border-primary/40 bg-primary/5',
            )}
          >
            <SlidersHorizontal aria-hidden className="size-4" />
            Columnas
            {hiddenCount > 0 ? (
              <span className="ms-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                {columns.length - hiddenCount}/{columns.length}
              </span>
            ) : null}
            <ChevronDown aria-hidden className="size-3.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Columnas visibles y orden</DropdownMenuLabel>
          <p className="px-2 pb-2 text-xs text-muted-foreground">
            Usa las flechas para reordenar. Arrastra el borde del encabezado para
            cambiar el ancho.
          </p>
          {columns.map((col) => (
            <div
              key={col.key}
              className="flex items-center gap-1 rounded-sm px-1 py-0.5 hover:bg-accent/50"
            >
              <button
                type="button"
                disabled={col.locked}
                className={cn(
                  'flex min-w-0 flex-1 cursor-default items-center gap-2 rounded-sm px-1 py-1.5 text-sm outline-none',
                  col.locked
                    ? 'cursor-not-allowed opacity-60'
                    : 'hover:bg-accent hover:text-accent-foreground',
                )}
                onClick={() => !col.locked && onToggleColumn(col.key)}
              >
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded border border-border',
                    col.visible && 'border-primary bg-primary text-primary-foreground',
                  )}
                >
                  {col.visible ? <Check aria-hidden className="size-3" /> : null}
                </span>
                <span className="truncate">{col.header}</span>
              </button>
              <div className="flex shrink-0 items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={!col.canMoveUp}
                  aria-label={`Subir columna ${col.header}`}
                  onClick={() => onMoveColumn(col.key, 'up')}
                >
                  <ArrowUp aria-hidden className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={!col.canMoveDown}
                  aria-label={`Bajar columna ${col.header}`}
                  onClick={() => onMoveColumn(col.key, 'down')}
                >
                  <ArrowDown aria-hidden className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
          <DropdownMenuSeparator />
          <button
            type="button"
            className="w-full rounded-sm px-2 py-1.5 text-start text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={onResetColumns}
          >
            Restablecer columnas
          </button>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="icon"
        aria-label={exportLabel}
        title={exportLabel}
        className="border-border shadow-sm"
        type="button"
        disabled={exportDisabled}
        onClick={onExport}
      >
        <Download aria-hidden className="size-4" />
      </Button>
    </div>
  )
}
