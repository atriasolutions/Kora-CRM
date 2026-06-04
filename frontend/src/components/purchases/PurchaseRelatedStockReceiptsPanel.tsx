import { ArrowDownToLine } from 'lucide-react'
import { Link } from 'react-router-dom'

import { RelatedEntityList } from '@/components/shared/RelatedEntityList'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { stockReceiptsForPurchase } from '@/data/stock-receipt-detail.mock'
import type { StockReceiptListItem } from '@/data/stock-receipts.mock'

type PurchaseRelatedStockReceiptsPanelProps = {
  purchaseId: string
}

function searchReceipt(row: StockReceiptListItem, q: string): boolean {
  return (
    row.number.toLowerCase().includes(q) ||
    row.status.toLowerCase().includes(q) ||
    row.productSummary.toLowerCase().includes(q) ||
    (row.confirmedAt ?? '').toLowerCase().includes(q)
  )
}

export function PurchaseRelatedStockReceiptsPanel({
  purchaseId,
}: PurchaseRelatedStockReceiptsPanelProps) {
  const receipts = stockReceiptsForPurchase(purchaseId)

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
        <ArrowDownToLine aria-hidden className="size-4 text-muted-foreground" />
        <CardTitle className="text-sm font-semibold">Ingresos de stock</CardTitle>
      </CardHeader>
      <CardContent>
        <RelatedEntityList
          items={receipts}
          searchPlaceholder="Buscar ingresos…"
          searchFilter={(item, q) => searchReceipt(item, q)}
          emptyMessage="Aún no hay ingresos para esta orden. Usa «Ingresar a stock» cuando la OC esté emitida o confirmada."
          renderItem={(r) => (
            <li key={r.id}>
              <Link
                to={`/ingresos/${r.id}`}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
              >
                <span>
                  <span className="font-medium text-foreground">{r.number}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {r.confirmedAt ?? '—'} · {r.productSummary}
                  </span>
                </span>
                <Badge variant={r.status === 'Confirmado' ? 'default' : 'secondary'}>
                  {r.status}
                </Badge>
              </Link>
            </li>
          )}
        />
      </CardContent>
    </Card>
  )
}
