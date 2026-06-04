import { Truck } from 'lucide-react'
import { useMemo } from 'react'

import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import {
  computeWarehouseFulfillmentTotals,
  purchaseHasWarehouseInboundPending,
} from '@/lib/purchase-inbound-stock'
import { inTransitLinesFromPurchases } from '@/lib/inventory-in-transit'
import { getAllRegistryPurchases } from '@/data/purchases-registry-store'

type PurchaseInboundPendingBannerProps = {
  purchase: PurchaseDetail
}

export function PurchaseInboundPendingBanner({ purchase }: PurchaseInboundPendingBannerProps) {
  const totals = useMemo(
    () => computeWarehouseFulfillmentTotals(purchase.id, purchase.lineItems),
    [purchase.id, purchase.lineItems],
  )

  const inTransitForPurchase = useMemo(
    () =>
      inTransitLinesFromPurchases(getAllRegistryPurchases()).filter(
        (l) => l.purchaseId === purchase.id,
      ),
    [purchase.id, purchase.lineItems],
  )

  const hasPending = purchaseHasWarehouseInboundPending(
    purchase.id,
    purchase.lineItems,
  )

  if (!hasPending) return null

  return (
    <div
      className="flex gap-3 rounded-xl border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-100"
      role="note"
    >
      <Truck aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium">Pendiente de bodega en esta OC</p>
        <p className="text-sky-900/90 dark:text-sky-100/90">
          Hay <strong>{totals.quantityPendingWarehouse}</strong> unidad(es) pedidas que aún no tienen
          ingreso confirmado. En inventario figuran como{' '}
          <strong>en tránsito</strong> hasta que ingreses el resto o ajustes la cantidad pedida.
        </p>
        {inTransitForPurchase.length > 0 ? (
          <ul className="mt-2 list-inside list-disc text-xs">
            {inTransitForPurchase.map((line) => (
              <li key={line.sku}>
                {line.productName} ({line.sku}): pendiente {line.pendingQty} de {line.orderedQty}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
