import { ArrowDownLeft, ArrowUpRight, ChevronRight, Package } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { InventoryMovementAdjustmentDialog } from '@/components/inventory/InventoryMovementAdjustmentDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InventoryDetail, InventoryMovementLine } from '@/data/inventory-detail.mock'
import {
  classifyMovementSource,
  movementTypeBadgeLabel,
  resolveMovementDetailHref,
} from '@/lib/inventory-movement'
import { cn } from '@/lib/utils'

type InventoryMovementsPanelProps = {
  inventory: InventoryDetail
}

function movementTone(type: InventoryMovementLine['type']) {
  switch (type) {
    case 'Entrada':
      return 'text-emerald-700 dark:text-emerald-300'
    case 'Salida':
      return 'text-rose-700 dark:text-rose-300'
    case 'Reserva':
      return 'text-violet-700 dark:text-violet-300'
    default:
      return 'text-amber-700 dark:text-amber-300'
  }
}

function MovementRow({
  mv,
  onOpenAdjustment,
}: {
  mv: InventoryMovementLine
  onOpenAdjustment: (mv: InventoryMovementLine) => void
}) {
  const sourceKind = classifyMovementSource(mv)
  const detailHref = resolveMovementDetailHref(mv)
  const isNavigable = sourceKind === 'ingreso' || sourceKind === 'factura'
  const isAdjustment = sourceKind === 'ajuste'

  const isIn =
    mv.type === 'Entrada' ||
    mv.type === 'Ajuste' ||
    (mv.type === 'Traslado' && mv.quantity.trim().startsWith('+'))
  const Icon = isIn ? ArrowDownLeft : ArrowUpRight

  const rowContent = (
    <>
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted/60">
          <Icon aria-hidden className={cn('size-4', movementTone(mv.type))} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{movementTypeBadgeLabel(mv)}</Badge>
            <p className="font-semibold text-foreground">{mv.reference}</p>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {mv.when} · {mv.author}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:shrink-0 sm:flex-nowrap">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium tabular-nums">{mv.quantity}</span>
          <span className="text-base font-semibold tabular-nums text-muted-foreground">
            Saldo {mv.balance}
          </span>
        </div>
        {isNavigable && detailHref ? (
          <ChevronRight
            aria-hidden
            className="size-5 shrink-0 text-muted-foreground"
          />
        ) : null}
        {isAdjustment ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-border shadow-sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onOpenAdjustment(mv)
            }}
          >
            Ver ajuste
          </Button>
        ) : null}
      </div>
    </>
  )

  if (isNavigable && detailHref) {
    return (
      <li className="transition-colors hover:bg-muted/30">
        <Link
          to={detailHref}
          className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          {rowContent}
        </Link>
      </li>
    )
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      {rowContent}
    </li>
  )
}

export function InventoryMovementsPanel({ inventory }: InventoryMovementsPanelProps) {
  const { movements } = inventory
  const [adjustmentTarget, setAdjustmentTarget] = useState<InventoryMovementLine | null>(
    null,
  )

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Movimientos de inventario</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <div className="py-8 text-center">
              <Package aria-hidden className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Sin movimientos</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Aún no hay ingresos, facturas ni ajustes para este SKU.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {movements.map((mv) => (
                <MovementRow
                  key={mv.id}
                  mv={mv}
                  onOpenAdjustment={setAdjustmentTarget}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <InventoryMovementAdjustmentDialog
        movement={adjustmentTarget}
        open={adjustmentTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAdjustmentTarget(null)
        }}
      />
    </>
  )
}
