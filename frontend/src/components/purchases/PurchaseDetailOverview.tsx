import { FileText } from 'lucide-react'

import { PurchaseFulfillmentOverview } from '@/components/purchases/PurchaseFulfillmentOverview'
import { PurchaseSupplierCard } from '@/components/purchases/PurchaseSupplierCard'
import { ExchangeRatesPanel } from '@/components/shared/ExchangeRatesPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import { cn } from '@/lib/utils'

type PurchaseDetailOverviewProps = {
  purchase: PurchaseDetail
  className?: string
}

export function PurchaseDetailOverview({
  purchase,
  className,
}: PurchaseDetailOverviewProps) {
  const observations = purchase.description?.trim()

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid gap-4 lg:grid-cols-2">
        <PurchaseSupplierCard purchase={purchase} />
        <PurchaseFulfillmentOverview purchase={purchase} />
      </div>
      <ExchangeRatesPanel rates={purchase} />
      {observations ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <FileText aria-hidden className="size-4 text-primary" />
              Observaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-foreground">{observations}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
