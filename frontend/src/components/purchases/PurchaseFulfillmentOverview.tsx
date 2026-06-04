import { PackageCheck, PackageOpen, Receipt } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import { purchaseOrderTotals } from '@/lib/purchase-line-item'
import { cn } from '@/lib/utils'

type PurchaseFulfillmentOverviewProps = {
  purchase: PurchaseDetail
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  sub: string
  icon: typeof PackageOpen
  tone: 'neutral' | 'accent'
}) {
  const toneStyles = {
    neutral: {
      box: 'border-border bg-card',
      label: 'text-muted-foreground',
      value: 'text-foreground',
      sub: 'text-muted-foreground',
      icon: 'text-muted-foreground',
    },
    accent: {
      box: 'border-primary/20 bg-primary/5',
      label: 'text-muted-foreground',
      value: 'text-foreground',
      sub: 'text-muted-foreground',
      icon: 'text-primary',
    },
  }[tone]

  return (
    <div className={cn('rounded-lg border px-3 py-3', toneStyles.box)}>
      <div className={cn('flex items-center gap-2 text-xs font-medium', toneStyles.label)}>
        <Icon aria-hidden className={cn('size-3.5 shrink-0', toneStyles.icon)} />
        {label}
      </div>
      <p className={cn('mt-1 text-xl font-semibold tabular-nums', toneStyles.value)}>
        {value}
      </p>
      <p className={cn('text-xs', toneStyles.sub)}>{sub}</p>
    </div>
  )
}

export function PurchaseFulfillmentOverview({ purchase }: PurchaseFulfillmentOverviewProps) {
  const totals = purchaseOrderTotals(purchase.lineItems)
  const productLines = purchase.lineItems.filter((li) => li.productId?.trim()).length
  const manualLines = purchase.lineItems.length - productLines

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Resumen de la orden</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Unidades solicitadas"
            icon={PackageOpen}
            value={totals.quantityOrdered}
            sub={`${purchase.lineItems.length} línea${purchase.lineItems.length === 1 ? '' : 's'}`}
            tone="accent"
          />
          <StatCard
            label="Productos"
            icon={PackageCheck}
            value={productLines}
            sub="Ítems de catálogo (ingreso a stock)"
            tone="neutral"
          />
          <StatCard
            label="Monto OC"
            icon={Receipt}
            value={purchase.amount}
            sub={
              manualLines > 0
                ? `${manualLines} ítem${manualLines === 1 ? '' : 's'} manual${manualLines === 1 ? '' : 'es'}`
                : 'Total líneas'
            }
            tone="neutral"
          />
        </div>
      </CardContent>
    </Card>
  )
}
