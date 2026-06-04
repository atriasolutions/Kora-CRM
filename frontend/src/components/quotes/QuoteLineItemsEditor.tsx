import { Plus } from 'lucide-react'

import { QuoteLineItemFields } from '@/components/quotes/QuoteLineItemFields'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { QuoteLineItem } from '@/data/quote-detail.mock'
import { defaultQuoteLineItem } from '@/lib/quote-line-item'

type QuoteLineItemsEditorProps = {
  lineItems: QuoteLineItem[]
  onChange: (lineItems: QuoteLineItem[]) => void
  idPrefix?: string
}

export function QuoteLineItemsEditor({
  lineItems,
  onChange,
  idPrefix = 'quote-lines',
}: QuoteLineItemsEditorProps) {
  const patchLine = (id: string, line: QuoteLineItem) => {
    onChange(lineItems.map((li) => (li.id === id ? line : li)))
  }

  const addLine = () => {
    onChange([...lineItems, defaultQuoteLineItem()])
  }

  const removeLine = (id: string) => {
    onChange(lineItems.filter((li) => li.id !== id))
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">Líneas de cotización</CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-border"
          onClick={addLine}
        >
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
          lineItems.map((li, index) => (
            <QuoteLineItemFields
              key={li.id}
              line={li}
              index={index}
              idPrefix={idPrefix}
              canRemove={lineItems.length > 1}
              onPatch={(line) => patchLine(li.id, line)}
              onRemove={() => removeLine(li.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}
