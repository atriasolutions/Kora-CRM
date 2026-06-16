import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InvoiceListItem } from '@/data/invoices.mock'
import { invoiceListStatusLabel, invoiceStatusVariant, resolveInvoiceListStage } from '@/lib/invoice-display'
import { documentKindLabel } from '@/lib/invoice-dte'

type InvoiceRelatedAdjustmentsPanelProps = {
  adjustments: InvoiceListItem[]
}

export function InvoiceRelatedAdjustmentsPanel({
  adjustments,
}: InvoiceRelatedAdjustmentsPanelProps) {
  if (adjustments.length === 0) return null

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Documentos relacionados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {adjustments.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <Link
                to={`/facturacion/${item.id}`}
                className="font-mono font-medium text-primary hover:underline"
              >
                {item.number}
              </Link>
              <p className="text-xs text-muted-foreground">
                {documentKindLabel(item.documentKind)}
                {item.siiNumber ? ` · Folio ${item.siiNumber}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.amount}</span>
              <Badge variant={invoiceStatusVariant(resolveInvoiceListStage(item))}>
                {invoiceListStatusLabel(item)}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
