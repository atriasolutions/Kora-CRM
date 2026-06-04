import { Trash2 } from 'lucide-react'

import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { ProductLookupField } from '@/components/shared/ProductLookupField'
import { Button } from '@/components/ui/button'
import type { StockReceiptLineItem } from '@/data/stock-receipt-detail.mock'
import type { ProductListItem } from '@/data/products.mock'
import { formatIntegerFromInput } from '@/lib/form-input-format'
import { stockReceiptLineFromProduct } from '@/lib/stock-receipt-line-item'

type StockReceiptLineItemFieldsProps = {
  line: StockReceiptLineItem
  index: number
  idPrefix: string
  canRemove: boolean
  /** Máximo ingresable según pendiente de la OC (mismo SKU). */
  pendingMax?: number
  onPatch: (patch: Partial<StockReceiptLineItem>) => void
  onRemove: () => void
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="truncate rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
        {value || '—'}
      </p>
    </div>
  )
}

export function StockReceiptLineItemFields({
  line,
  index,
  idPrefix,
  canRemove,
  pendingMax,
  onPatch,
  onRemove,
}: StockReceiptLineItemFieldsProps) {
  const hasProduct = Boolean(line.productId?.trim())

  const handleProductChange = (_productId: string, product?: ProductListItem) => {
    if (!product) {
      onPatch({ productId: undefined, product: '', sku: '' })
      return
    }
    onPatch(stockReceiptLineFromProduct(product, line.id))
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/15 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Línea {index + 1}
        </span>
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            aria-label={`Eliminar línea ${index + 1}`}
            onClick={onRemove}
          >
            <Trash2 aria-hidden className="size-4" />
          </Button>
        ) : null}
      </div>
      <ProductLookupField
        label="Producto"
        value={line.productId ?? ''}
        productName={line.product}
        productSku={line.sku}
        onChange={handleProductChange}
      />
      {!hasProduct && (line.sku.trim() || line.product.trim()) ? (
        <p className="text-xs text-muted-foreground">
          SKU y descripción provienen de la orden de compra. Para cambiarlos, selecciona otro
          producto del catálogo.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <ReadOnlyField label="SKU" value={line.sku} />
        <div className="space-y-1">
          <ContactFormInput
            id={`${idPrefix}-qty-${line.id}`}
            label="Cantidad"
            inputVariant="integer"
            value={line.quantity > 0 ? String(line.quantity) : ''}
            placeholder="1"
            onChange={(raw) => {
              const digits = formatIntegerFromInput(raw)
              if (!digits) {
                onPatch({ quantity: 0 })
                return
              }
              const parsed = Number.parseInt(digits, 10)
              onPatch({ quantity: parsed > 0 ? parsed : 1 })
            }}
            onBlur={() => {
              let qty = line.quantity
              if (!qty || qty < 1) qty = 1
              if (pendingMax != null && qty > pendingMax) qty = pendingMax
              if (qty !== line.quantity) onPatch({ quantity: qty })
            }}
          />
          {pendingMax != null ? (
            <p className="text-xs text-muted-foreground">
              Pendiente en OC:{' '}
              <span className="font-medium text-foreground">{pendingMax}</span> uds
            </p>
          ) : null}
        </div>
      </div>
      <ReadOnlyField label="Descripción" value={line.product} />
    </div>
  )
}
