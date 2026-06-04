import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal } from 'lucide-react'
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'

import {
  ListTableToolbar,
  type ListTableColumnOption,
} from '@/components/list/ListTableToolbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { InventoryListItem } from '@/data/inventory.mock'
import {
  aggregateInventoryProducts,
  inventoryProductDetailPath,
  inventoryProductMatchesFilters,
  inventoryProductMatchesSearch,
  type InventoryProductSummary,
} from '@/lib/inventory-aggregate'
import { inventoryStatusVariant } from '@/lib/inventory-display'
import { inTransitLinesForSku } from '@/lib/inventory-in-transit'
import type { InventoryFilters } from '@/lib/inventory-filters'
import { buildCsvContent, downloadCsvFile, type ListSortDirection } from '@/lib/list-table'
import { usePurchaseLinesSyncVersion } from '@/hooks/use-purchase-lines-sync-version'
import { cn } from '@/lib/utils'

type SortKey = 'product' | 'available' | 'reserved' | 'inTransit' | 'min' | 'status'

type InventoryProductListProps = {
  rows: InventoryListItem[]
  query: string
  filters: InventoryFilters
  onEditRow?: (row: InventoryListItem) => void
  onToolbarChange?: (toolbar: ReactNode | null) => void
}

const PAGE_SIZE = 20

const INVENTORY_PRODUCT_TABLE_COLUMNS = [
  { key: 'product', header: 'Producto', locked: true },
  { key: 'available', header: 'Disponible' },
  { key: 'reserved', header: 'Reservado' },
  { key: 'inTransit', header: 'En tránsito' },
  { key: 'min', header: 'Mínimo' },
  { key: 'status', header: 'Estado' },
] as const

type InventoryProductColumnKey = (typeof INVENTORY_PRODUCT_TABLE_COLUMNS)[number]['key']

function createDefaultVisibleColumns(): Record<InventoryProductColumnKey, boolean> {
  return Object.fromEntries(
    INVENTORY_PRODUCT_TABLE_COLUMNS.map((c) => [c.key, true]),
  ) as Record<InventoryProductColumnKey, boolean>
}

function SortableTh({
  label,
  active,
  direction,
  onClick,
  className,
}: {
  label: string
  active: boolean
  direction: ListSortDirection
  onClick: () => void
  className?: string
}) {
  const Icon = active
    ? direction === 'asc'
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown
  return (
    <th className={cn('px-4 py-3', className)}>
      <button
        type="button"
        className="inline-flex w-full items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        onClick={onClick}
      >
        {label}
        <Icon aria-hidden className={cn('size-3.5', !active && 'opacity-40')} />
      </button>
    </th>
  )
}

export function InventoryProductList({
  rows,
  query,
  filters,
  onEditRow,
  onToolbarChange,
}: InventoryProductListProps) {
  const purchaseLinesVersion = usePurchaseLinesSyncVersion()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('product')
  const [sortDir, setSortDir] = useState<ListSortDirection>('asc')
  const [visibleColumns, setVisibleColumns] = useState(createDefaultVisibleColumns)

  const products = useMemo(() => {
    const aggregated = aggregateInventoryProducts(rows)
    return aggregated.filter(
      (p) =>
        inventoryProductMatchesSearch(p, query) &&
        inventoryProductMatchesFilters(p, filters),
    )
  }, [rows, query, filters, purchaseLinesVersion])

  const sorted = useMemo(() => {
    const copy = [...products]
    const dir = sortDir === 'asc' ? 1 : -1
    copy.sort((a, b) => {
      switch (sortKey) {
        case 'available':
          return (a.availableQtyNum - b.availableQtyNum) * dir
        case 'reserved':
          return (a.reservedQtyNum - b.reservedQtyNum) * dir
        case 'inTransit':
          return (a.inTransitQtyNum - b.inTransitQtyNum) * dir
        case 'min':
          return (a.minStockNum - b.minStockNum) * dir
        case 'status':
          return a.status.localeCompare(b.status, 'es') * dir
        default:
          return a.productName.localeCompare(b.productName, 'es') * dir
      }
    })
    return copy
  }, [products, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const isColumnVisible = (key: InventoryProductColumnKey) => visibleColumns[key]

  const columnOptions = useMemo((): ListTableColumnOption[] => {
    return INVENTORY_PRODUCT_TABLE_COLUMNS.map((col, index) => ({
      key: col.key,
      header: col.header,
      visible: visibleColumns[col.key],
      locked: 'locked' in col ? col.locked : false,
      canMoveUp: index > 0,
      canMoveDown: index < INVENTORY_PRODUCT_TABLE_COLUMNS.length - 1,
    }))
  }, [visibleColumns])

  const toggleColumn = useCallback((key: string) => {
    const col = INVENTORY_PRODUCT_TABLE_COLUMNS.find((c) => c.key === key)
    if (!col || ('locked' in col && col.locked)) return
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key as InventoryProductColumnKey] }))
  }, [])

  const moveColumn = useCallback((_key: string, _direction: 'up' | 'down') => {
    // Orden fijo en la tabla consolidada por SKU
  }, [])

  const resetColumns = useCallback(() => {
    setVisibleColumns(createDefaultVisibleColumns())
  }, [])

  const handleExport = useCallback(() => {
    const headers = ['Producto', 'SKU', 'Disponible', 'Reservado', 'En tránsito', 'Mínimo', 'Estado']
    const csvRows = sorted.map((p) => [
      p.productName,
      p.sku,
      p.availableLabel,
      p.reservedLabel,
      p.inTransitLabel,
      p.minStockLabel,
      p.status,
    ])
    const date = new Date().toISOString().slice(0, 10)
    downloadCsvFile(`inventario-${date}.csv`, buildCsvContent(headers, csvRows))
  }, [sorted])

  const embeddedToolbar = useMemo(
    () => (
      <ListTableToolbar
        columns={columnOptions}
        onToggleColumn={toggleColumn}
        onMoveColumn={moveColumn}
        onResetColumns={resetColumns}
        onExport={handleExport}
        exportDisabled={sorted.length === 0}
        exportLabel="Descargar inventario (CSV)"
      />
    ),
    [columnOptions, toggleColumn, moveColumn, resetColumns, handleExport, sorted.length],
  )

  useLayoutEffect(() => {
    if (!onToolbarChange) return
    onToolbarChange(embeddedToolbar)
    return () => onToolbarChange(null)
  }, [onToolbarChange, embeddedToolbar])

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-16 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">Sin productos en inventario</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Prueba otra búsqueda por nombre o SKU, o ajusta los filtros.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {products.length} producto{products.length === 1 ? '' : 's'} · totales consolidados por
        SKU
      </p>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                {isColumnVisible('product') ? (
                  <SortableTh
                    label="Producto"
                    active={sortKey === 'product'}
                    direction={sortDir}
                    onClick={() => toggleSort('product')}
                  />
                ) : null}
                {isColumnVisible('available') ? (
                  <SortableTh
                    label="Disponible"
                    active={sortKey === 'available'}
                    direction={sortDir}
                    onClick={() => toggleSort('available')}
                    className="text-right [&_button]:justify-end"
                  />
                ) : null}
                {isColumnVisible('reserved') ? (
                  <SortableTh
                    label="Reservado"
                    active={sortKey === 'reserved'}
                    direction={sortDir}
                    onClick={() => toggleSort('reserved')}
                    className="text-right [&_button]:justify-end"
                  />
                ) : null}
                {isColumnVisible('inTransit') ? (
                  <SortableTh
                    label="En tránsito"
                    active={sortKey === 'inTransit'}
                    direction={sortDir}
                    onClick={() => toggleSort('inTransit')}
                    className="text-right [&_button]:justify-end"
                  />
                ) : null}
                {isColumnVisible('min') ? (
                  <SortableTh
                    label="Mínimo"
                    active={sortKey === 'min'}
                    direction={sortDir}
                    onClick={() => toggleSort('min')}
                    className="text-right [&_button]:justify-end"
                  />
                ) : null}
                {isColumnVisible('status') ? (
                  <SortableTh
                    label="Estado"
                    active={sortKey === 'status'}
                    direction={sortDir}
                    onClick={() => toggleSort('status')}
                  />
                ) : null}
                <th className="w-12 px-2 py-3" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageRows.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  visibleColumns={visibleColumns}
                  onOpen={() => navigate(inventoryProductDetailPath(product.sku))}
                  onEdit={onEditRow}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            Página {safePage} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ProductRow({
  product,
  visibleColumns,
  onOpen,
  onEdit,
}: {
  product: InventoryProductSummary
  visibleColumns: Record<InventoryProductColumnKey, boolean>
  onOpen: () => void
  onEdit?: (row: InventoryListItem) => void
}) {
  const primaryRow = product.locationRows[0]
  const inTransitRefs = inTransitLinesForSku(product.sku)

  return (
    <tr
      className="cursor-pointer bg-card transition-colors hover:bg-muted/30"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen()
      }}
      tabIndex={0}
    >
      {visibleColumns.product ? (
        <td className="px-4 py-3">
          <p className="font-medium text-foreground">{product.productName}</p>
          <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
          {product.warehouseCount > 0 ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {product.warehouseCount} bodega{product.warehouseCount === 1 ? '' : 's'}
            </p>
          ) : null}
          {product.inTransitQtyNum > 0 && inTransitRefs.length > 0 ? (
            <p className="mt-1 text-[11px] text-sky-700 dark:text-sky-300">
              En tránsito:{' '}
              {inTransitRefs.map((l) => `${l.reference} (${l.pendingQty})`).join(' · ')}
            </p>
          ) : null}
        </td>
      ) : null}
      {visibleColumns.available ? (
        <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
          {product.availableLabel}
        </td>
      ) : null}
      {visibleColumns.reserved ? (
        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
          {product.reservedLabel}
        </td>
      ) : null}
      {visibleColumns.inTransit ? (
        <td
          className={cn(
            'px-4 py-3 text-right tabular-nums',
            product.inTransitQtyNum > 0
              ? 'font-medium text-sky-700 dark:text-sky-300'
              : 'text-muted-foreground',
          )}
        >
          {product.inTransitLabel}
        </td>
      ) : null}
      {visibleColumns.min ? (
        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
          {product.minStockLabel}
        </td>
      ) : null}
      {visibleColumns.status ? (
        <td className="px-4 py-3">
          <Badge variant={inventoryStatusVariant(product.status)}>{product.status}</Badge>
        </td>
      ) : null}
      <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="size-8">
              <MoreHorizontal aria-hidden className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onOpen}>Ver detalle</DropdownMenuItem>
            {primaryRow && onEdit ? (
              <DropdownMenuItem onSelect={() => onEdit(primaryRow)}>
                Editar registro
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}
