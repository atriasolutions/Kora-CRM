import { Plus } from 'lucide-react'

import { StockReceiptLineItemFields } from '@/components/stock-receipts/StockReceiptLineItemFields'
import { StockReceiptLineItemsPanel } from '@/components/stock-receipts/StockReceiptLineItemsPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { StockReceiptLineItem } from '@/data/stock-receipt-detail.mock'
import { defaultStockReceiptLineItem } from '@/lib/stock-receipt-line-item'

type StockReceiptLineItemsEditorProps = {
  lineItems: StockReceiptLineItem[]
  onChange: (lineItems: StockReceiptLineItem[]) => void
  idPrefix?: string
  /** Vista tabla en tarjeta (detalle del ingreso). */
  readOnly?: boolean
  pendingMaxForSku?: (sku: string) => number | undefined
}

export function StockReceiptLineItemsEditor({
  lineItems,
  onChange,
  idPrefix = 'stock-receipt-lines',
  readOnly = false,
  pendingMaxForSku,
}: StockReceiptLineItemsEditorProps) {
  if (readOnly) {
    return <StockReceiptLineItemsPanel lineItems={lineItems} />
  }

  const patchLine = (id: string, line: StockReceiptLineItem) => {
    onChange(lineItems.map((li) => (li.id === id ? line : li)))
  }

  const addLine = () => {
    onChange([...lineItems, defaultStockReceiptLineItem()])
  }

  const removeLine = (id: string) => {
    onChange(lineItems.filter((li) => li.id !== id))
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">Líneas de ingreso</CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={addLine}>
          <Plus aria-hidden className="size-4" />
          Línea
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {lineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Agrega al menos una línea con SKU y cantidad.
          </p>
        ) : (
          lineItems.map((line, index) => (
            <StockReceiptLineItemFields
              key={line.id}
              line={line}
              index={index}
              idPrefix={idPrefix}
              canRemove={lineItems.length > 1}
              pendingMax={pendingMaxForSku?.(line.sku) ?? undefined}
              onPatch={(patch) => patchLine(line.id, { ...line, ...patch })}
              onRemove={() => removeLine(line.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}
