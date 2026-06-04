import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InvoiceLineItem } from '@/data/invoice-detail.mock'
import { invoiceLineSubjectToVat } from '@/lib/invoice-line-item'
import { cn } from '@/lib/utils'

type InvoiceLineItemsPanelProps = {
  lineItems: InvoiceLineItem[]
  className?: string
}

export function InvoiceLineItemsPanel({ lineItems, className }: InvoiceLineItemsPanelProps) {
  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Líneas de factura</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">SKU</th>
                <th className="px-4 py-2 font-medium">Descripción</th>
                <th className="px-4 py-2 font-medium">Cant.</th>
                <th className="px-4 py-2 font-medium">Precio orig.</th>
                <th className="px-4 py-2 font-medium">Precio CLP</th>
                <th className="px-4 py-2 font-medium">Desc.</th>
                <th className="px-4 py-2 font-medium">IVA</th>
                <th className="px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li) => (
                <tr key={li.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{li.sku}</td>
                  <td className="px-4 py-3 font-medium">{li.description}</td>
                  <td className="px-4 py-3 tabular-nums">{li.quantity}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {li.unitPriceOriginal && li.priceCurrency && li.priceCurrency !== 'CLP'
                      ? li.unitPriceOriginal
                      : '—'}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{li.unitPrice}</td>
                  <td className="px-4 py-3">{li.discount}</td>
                  <td className="px-4 py-3 text-xs">
                    {invoiceLineSubjectToVat(li) ? 'Afecto' : 'Exento'}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{li.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
