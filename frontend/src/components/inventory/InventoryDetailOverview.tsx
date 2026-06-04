import { AlertTriangle, Boxes, MapPin, Package, UserRound, Warehouse } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  InventoryStockStatusPanel,
  InventoryStockStatusPanelFromProduct,
} from '@/components/inventory/InventoryStockStatusPanel'
import { RecordAuditMeta } from '@/components/shared/RecordAuditMeta'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { InventoryDetail } from '@/data/inventory-detail.mock'
import { getInventoryProductSummaryById } from '@/lib/inventory-aggregate'
import { inventoryStatusVariant } from '@/lib/inventory-display'
import { cn } from '@/lib/utils'

type InventoryDetailOverviewProps = {
  inventory: InventoryDetail
  onGoToWarehouses?: () => void
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-end font-medium text-foreground">{value}</span>
    </div>
  )
}

export function InventoryDetailOverview({
  inventory,
  onGoToWarehouses,
}: InventoryDetailOverviewProps) {
  const description = inventory.description ?? ''
  const productSummary = inventory.isProductView
    ? getInventoryProductSummaryById(inventory.id)
    : null

  const available =
    inventory.availableQtyNum ?? inventory.quantityNum
  const reserved = inventory.reservedQtyNum ?? 0

  return (
    <div className="space-y-4">
      {productSummary ? (
        <InventoryStockStatusPanelFromProduct product={productSummary} compact />
      ) : (
        <InventoryStockStatusPanel
          compact
          status={inventory.status}
          productName={inventory.productName}
          availableQtyNum={available}
          reservedQtyNum={reserved}
          inTransitQtyNum={inventory.inTransitQtyNum}
          inTransitLabel={inventory.inTransitLabel}
          minStockNum={inventory.minStockNum}
          rowForRecompute={inventory}
        />
      )}

      {inventory.isProductView && onGoToWarehouses ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Vista consolidada por SKU. Revisa el desglose por bodega en la pestaña{' '}
            <span className="font-medium text-foreground">Bodegas</span>.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onGoToWarehouses}>
            Ver por bodega
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Boxes aria-hidden className="size-4 text-primary" />
              Producto y ubicación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <SpecRow label="SKU" value={inventory.sku} />
            <SpecRow label="Categoría" value={inventory.category?.trim() || '—'} />
            <SpecRow label="Bodega" value={inventory.location} />
            <SpecRow label="Zona" value={inventory.warehouseZone} />
            <Separator />
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={inventoryStatusVariant(inventory.status)}>
                {inventory.status}
              </Badge>
              <Badge variant="outline">{inventory.stockHealthPercent}% salud</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Package aria-hidden className="size-4 text-primary" />
              Operación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <SpecRow label="En bodega" value={inventory.quantity} />
            <SpecRow label="Disponible" value={String(available)} />
            <SpecRow label="Reservado" value={String(reserved)} />
            {(inventory.inTransitQtyNum ?? 0) > 0 ? (
              <SpecRow
                label="En tránsito (OC)"
                value={inventory.inTransitLabel ?? String(inventory.inTransitQtyNum)}
              />
            ) : null}
            <SpecRow label="Stock mínimo" value={inventory.minStock} />
            <SpecRow label="Costo unitario" value={inventory.unitCost} />
            <Separator />
            <div className="flex gap-3 text-sm">
              <UserRound aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Responsable</p>
                <p className="font-medium">{inventory.owner?.trim() || '—'}</p>
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Último movimiento</p>
                <p className="font-medium">{inventory.lastMovement}</p>
              </div>
            </div>
            {inventory.linkedPurchaseRef ? (
              <div className="flex gap-3 text-sm">
                <Warehouse aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">OC vinculada</p>
                  <Link to="/compras" className="font-medium text-primary hover:underline">
                    {inventory.linkedPurchaseRef}
                  </Link>
                </div>
              </div>
            ) : null}
            {inventory.pendingActivities > 0 ? (
              <SpecRow
                label="Actividades pendientes"
                value={String(inventory.pendingActivities)}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      {inventory.status === 'Sin stock' || inventory.status === 'Quiebre de stock' ? (
        <div
          className={cn(
            'flex gap-3 rounded-lg border px-4 py-3 text-sm',
            inventory.status === 'Sin stock'
              ? 'border-destructive/30 bg-destructive/5 text-destructive'
              : 'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100',
          )}
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Atención de reposición</p>
            <p className="mt-0.5 text-[13px] opacity-90">
              El nivel actual está por debajo del mínimo configurado. Coordina ingreso o compra.
            </p>
          </div>
        </div>
      ) : null}

      {inventory.nextStep ? (
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Próximo paso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{inventory.nextStep.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{inventory.nextStep.when}</p>
          </CardContent>
        </Card>
      ) : null}

      {description.trim() ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Descripción</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <RecordAuditMeta record={inventory} />
    </div>
  )
}
