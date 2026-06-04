import { Package, Warehouse } from 'lucide-react'

import { RecordAuditMeta } from '@/components/shared/RecordAuditMeta'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { StockReceiptDetail } from '@/data/stock-receipt-detail.mock'

type StockReceiptDetailSidebarProps = {
  receipt: StockReceiptDetail
}

export function StockReceiptDetailSidebar({ receipt }: StockReceiptDetailSidebarProps) {
  const totalQty = receipt.lineItems.reduce((sum, li) => sum + li.quantity, 0)

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="flex gap-2">
            <Warehouse aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="text-muted-foreground">Bodega: </span>
              <span className="font-medium">{receipt.warehouse}</span>
            </span>
          </p>
          <p className="flex gap-2">
            <Package aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="text-muted-foreground">Unidades: </span>
              <span className="font-medium tabular-nums">{totalQty}</span>
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Responsable: </span>
            <span className="font-medium">{receipt.owner}</span>
          </p>
          {receipt.confirmedAt ? (
            <p>
              <span className="text-muted-foreground">Fecha confirmación: </span>
              <span className="font-medium">{receipt.confirmedAt}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      {receipt.memo?.trim() ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{receipt.memo}</p>
          </CardContent>
        </Card>
      ) : null}

      <RecordAuditMeta record={receipt} className="lg:col-span-2 xl:col-span-3" />
    </div>
  )
}
