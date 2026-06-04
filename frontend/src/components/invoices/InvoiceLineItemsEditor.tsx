import { Plus } from 'lucide-react'

import { InvoiceLineItemFields } from '@/components/invoices/InvoiceLineItemFields'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InvoiceLineItem } from '@/data/invoice-detail.mock'
import { defaultInvoiceLineItem, invoiceLineSubjectToVat } from '@/lib/invoice-line-item'

type InvoiceLineItemsEditorProps = {
  lineItems: InvoiceLineItem[]
  onChange: (lineItems: InvoiceLineItem[]) => void
  idPrefix?: string
  readOnly?: boolean
}

export function InvoiceLineItemsEditor({
  lineItems,
  onChange,
  idPrefix = 'invoice-lines',
  readOnly = false,
}: InvoiceLineItemsEditorProps) {
  if (readOnly) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Líneas de factura</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">SKU</th>
                  <th className="px-4 py-2 font-medium">Descripción</th>
                  <th className="px-4 py-2 font-medium">Cant.</th>
                  <th className="px-4 py-2 font-medium">IVA</th>
                  <th className="px-4 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li) => (
                  <tr key={li.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{li.sku}</td>
                    <td className="px-4 py-3">{li.description}</td>
                    <td className="px-4 py-3 tabular-nums">{li.quantity}</td>
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

  const patchLine = (id: string, line: InvoiceLineItem) => {
    onChange(lineItems.map((li) => (li.id === id ? line : li)))
  }

  const addLine = () => {
    onChange([...lineItems, defaultInvoiceLineItem()])
  }

  const removeLine = (id: string) => {
    onChange(lineItems.filter((li) => li.id !== id))
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">Líneas de factura</CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={addLine}>
          <Plus aria-hidden className="size-4" />
          Línea
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {lineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Agrega al menos una línea de producto o servicio.
          </p>
        ) : (
          lineItems.map((line, index) => (
            <InvoiceLineItemFields
              key={line.id}
              line={line}
              index={index}
              idPrefix={idPrefix}
              canRemove={lineItems.length > 1}
              onPatch={(line) => patchLine(line.id, line)}
              onRemove={() => removeLine(line.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}
