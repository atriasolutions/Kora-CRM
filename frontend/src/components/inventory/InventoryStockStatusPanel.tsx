import { Link } from 'react-router-dom'
import { AlertTriangle, Package, Truck } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InventoryListItem, InventoryStatus } from '@/data/inventory.mock'
import { INVENTORY_STATUS_OPTIONS } from '@/data/inventory.mock'
import { inventoryStatusVariant } from '@/lib/inventory-display'
import type { InventoryProductSummary } from '@/lib/inventory-aggregate'
import { inTransitLinesForSku } from '@/lib/inventory-in-transit'
import {
  INVENTORY_STATUS_DESCRIPTIONS,
  deriveInventoryStatusFromRow,
} from '@/lib/inventory-status'
import { cn } from '@/lib/utils'

type InventoryStockStatusPanelProps = {
  status: InventoryStatus
  productName: string
  availableQtyNum: number
  reservedQtyNum: number
  inTransitQtyNum?: number
  inTransitLabel?: string
  inTransitPurchaseRefs?: { purchaseId: string; reference: string; pendingQty: number }[]
  minStockNum: number
  rowForRecompute?: Pick<
    InventoryListItem,
    'status' | 'minStockNum' | 'availableQtyNum' | 'reservedQtyNum' | 'quantityNum'
  >
  /** Vista reducida para detalle (sin grilla de todos los estados). */
  compact?: boolean
}

export function InventoryStockStatusPanel({
  status,
  productName,
  availableQtyNum,
  reservedQtyNum,
  inTransitQtyNum = 0,
  inTransitLabel = '0',
  inTransitPurchaseRefs = [],
  minStockNum,
  rowForRecompute,
  compact = false,
}: InventoryStockStatusPanelProps) {
  const currentStatus = rowForRecompute
    ? deriveInventoryStatusFromRow(rowForRecompute)
    : status

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Package aria-hidden className="size-4" />
            </span>
            <div>
              <CardTitle className="text-base font-semibold">Estado de stock</CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Calculado según disponible, reservado y mínimo de{' '}
                <span className="font-medium text-foreground">{productName}</span>.
              </p>
            </div>
          </div>
          <Badge variant={inventoryStatusVariant(currentStatus)} className="shrink-0 text-sm">
            {currentStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Disponible</p>
            <p className="text-lg font-semibold tabular-nums">{availableQtyNum}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Reservado</p>
            <p className="text-lg font-semibold tabular-nums">{reservedQtyNum}</p>
          </div>
          <div
            className={cn(
              'rounded-lg border px-3 py-2',
              inTransitQtyNum > 0
                ? 'border-sky-200 bg-sky-50/80 dark:border-sky-900 dark:bg-sky-950/30'
                : 'border-border bg-muted/20',
            )}
          >
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Truck aria-hidden className="size-3.5" />
              En tránsito (OC)
            </p>
            <p className="text-lg font-semibold tabular-nums">{inTransitLabel}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">Mínimo</p>
            <p className="text-lg font-semibold tabular-nums">{minStockNum}</p>
          </div>
        </div>

        {inTransitQtyNum > 0 && inTransitPurchaseRefs.length > 0 ? (
          <div className="rounded-lg border border-sky-200/80 bg-sky-50/50 px-3 py-2.5 dark:border-sky-900 dark:bg-sky-950/20">
            <p className="text-xs font-medium text-foreground">Órdenes de compra sin recibir</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {inTransitPurchaseRefs.map((line) => (
                <li key={`${line.purchaseId}-${line.reference}`}>
                  <Link
                    to={`/compras/${line.purchaseId}`}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {line.reference}
                  </Link>
                  <span className="text-muted-foreground">
                    {' '}
                    · pendiente {line.pendingQty}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="rounded-lg border border-border bg-muted/15 px-3 py-2.5 text-sm text-muted-foreground">
          {INVENTORY_STATUS_DESCRIPTIONS[currentStatus]}
        </p>

        {!compact ? (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estados posibles
            </p>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {INVENTORY_STATUS_OPTIONS.map((option) => {
                const active = option === currentStatus
                const critical =
                  option === 'Sin stock' ||
                  option === 'Quiebre de stock' ||
                  option === 'Stock bajo'
                return (
                  <li
                    key={option}
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-sm transition-colors',
                      active
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border bg-card opacity-80',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {critical && active ? (
                        <AlertTriangle aria-hidden className="size-3.5 shrink-0 text-amber-600" />
                      ) : null}
                      <span
                        className={cn(
                          'font-medium',
                          active ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {option}
                      </span>
                      {active ? (
                        <Badge variant="outline" className="ms-auto h-5 text-[10px]">
                          Actual
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                      {INVENTORY_STATUS_DESCRIPTIONS[option]}
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function InventoryStockStatusPanelFromProduct({
  product,
  compact = false,
}: {
  product: InventoryProductSummary
  compact?: boolean
}) {
  const inTransitRefs = inTransitLinesForSku(product.sku).map((line) => ({
    purchaseId: line.purchaseId,
    reference: line.reference,
    pendingQty: line.pendingQty,
  }))

  return (
    <InventoryStockStatusPanel
      status={product.status}
      productName={product.productName}
      availableQtyNum={product.availableQtyNum}
      reservedQtyNum={product.reservedQtyNum}
      inTransitQtyNum={product.inTransitQtyNum}
      inTransitLabel={product.inTransitLabel}
      inTransitPurchaseRefs={inTransitRefs}
      minStockNum={product.minStockNum}
      compact={compact}
    />
  )
}
