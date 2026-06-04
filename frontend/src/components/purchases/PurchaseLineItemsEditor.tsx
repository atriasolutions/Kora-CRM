import { Plus } from 'lucide-react'

import { PurchaseLineItemFields } from '@/components/purchases/PurchaseLineItemFields'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PurchaseLineItem } from '@/data/purchase-detail.mock'
import { defaultPurchaseLineItem, recalcPurchaseLine } from '@/lib/purchase-line-item'

type PurchaseLineItemsEditorProps = {
  lineItems: PurchaseLineItem[]
  onChange: (lineItems: PurchaseLineItem[]) => void
  idPrefix?: string
}

export function PurchaseLineItemsEditor({
  lineItems,
  onChange,
  idPrefix = 'pur-lines',
}: PurchaseLineItemsEditorProps) {
  const patchLine = (id: string, patch: Partial<PurchaseLineItem>) => {
    onChange(
      lineItems.map((li) => (li.id === id ? recalcPurchaseLine({ ...li, ...patch }) : li)),
    )
  }

  const addLine = () => {
    onChange([...lineItems, defaultPurchaseLineItem()])
  }

  const removeLine = (id: string) => {
    onChange(lineItems.filter((li) => li.id !== id))
  }

  return (
    <Card className="border-primary/20 shadow-sm ring-1 ring-primary/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">Líneas de la orden</CardTitle>
        <Button type="button" size="sm" variant="outline" className="border-border" onClick={addLine}>
          <Plus aria-hidden className="size-4" />
          Línea
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {lineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Agrega al menos una línea de producto.</p>
        ) : (
          lineItems.map((li, index) => (
            <PurchaseLineItemFields
              key={li.id}
              line={li}
              index={index}
              idPrefix={idPrefix}
              canRemove={lineItems.length > 1}
              onPatch={(partial) => patchLine(li.id, partial)}
              onRemove={() => removeLine(li.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}
