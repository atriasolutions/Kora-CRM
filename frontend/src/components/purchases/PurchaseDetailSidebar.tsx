import {
  AlertTriangle,
  Calendar,
  MapPin,
  Package,
  ShoppingCart,
  Truck,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import { purchaseOrderTotals } from '@/lib/purchase-line-item'
import { purchaseJourneyStageVariant } from '@/lib/purchase-journey'

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar
  label: string
  value: string
}) {
  return (
    <div className="flex gap-3">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

type PurchaseDetailSidebarProps = {
  purchase: PurchaseDetail
}

export function PurchaseDetailSidebar({ purchase }: PurchaseDetailSidebarProps) {
  const totals = purchaseOrderTotals(purchase.lineItems)

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingCart aria-hidden className="size-4 text-primary" />
            Resumen de compra
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow icon={Package} label="Monto total" value={purchase.amount} />
          <InfoRow
            icon={Truck}
            label="Unidades solicitadas"
            value={`${totals.quantityOrdered} uds · ${totals.lineCount} líneas`}
          />
          <InfoRow icon={Calendar} label="Fecha de orden" value={purchase.orderDate} />
          <InfoRow icon={UserRound} label="Responsable" value={purchase.owner} />
          <Separator />
          <Badge variant={purchaseJourneyStageVariant(purchase.stage)}>{purchase.stage}</Badge>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Proveedor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {purchase.supplierId ? (
            <Link
              to={`/empresas/${purchase.supplierId}`}
              className="text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              {purchase.supplier}
            </Link>
          ) : (
            <p className="text-sm font-medium text-foreground">{purchase.supplier}</p>
          )}
          <InfoRow icon={UserRound} label="Contacto" value={purchase.supplierContact} />
          <InfoRow icon={MapPin} label="Entrega estimada" value={purchase.expectedDelivery} />
          <p className="text-xs text-muted-foreground">{purchase.paymentTerms}</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Logística</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Bodega: </span>
            <span className="font-medium">{purchase.warehouse || '—'}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Dirección: </span>
            <span className="font-medium">{purchase.deliveryAddress || '—'}</span>
          </p>
          {purchase.cancelReason ? (
            <p className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="font-medium">Motivo cancelación: </span>
                {purchase.cancelReason}
              </span>
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            En etapa desde {purchase.stageEnteredAt}
          </p>
        </CardContent>
      </Card>

    </div>
  )
}
