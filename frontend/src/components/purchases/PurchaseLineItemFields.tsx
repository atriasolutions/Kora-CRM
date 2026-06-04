import { Trash2 } from 'lucide-react'

import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { ProductLookupField } from '@/components/shared/ProductLookupField'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PurchaseLineItem } from '@/data/purchase-detail.mock'
import type { ProductListItem } from '@/data/products.mock'
import {
  isManualPurchaseLine,
  purchaseLineDescription,
  purchaseLineFromProduct,
  purchaseLineKind,
  recalcPurchaseLine,
} from '@/lib/purchase-line-item'
import {
  PURCHASE_LINE_UOM_OPTIONS,
  purchaseLineUnitSelectValue,
  purchaseLineUnitShort,
} from '@/lib/purchase-line-units'

type PurchaseLineItemFieldsProps = {
  line: PurchaseLineItem
  index: number
  idPrefix: string
  canRemove: boolean
  onPatch: (patch: Partial<PurchaseLineItem>) => void
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

export function PurchaseLineItemFields({
  line,
  index,
  idPrefix,
  canRemove,
  onPatch,
  onRemove,
}: PurchaseLineItemFieldsProps) {
  const kind = purchaseLineKind(line)
  const isManual = isManualPurchaseLine(line)
  const uomValue = purchaseLineUnitSelectValue(line)
  const uomLabel =
    PURCHASE_LINE_UOM_OPTIONS.find((o) => o.value === uomValue)?.label ??
    purchaseLineUnitShort(line)
  const unitDisplay =
    uomValue === 'otra' && line.customUnit?.trim() ? line.customUnit : uomLabel

  const handleProductChange = (_productId: string, product?: ProductListItem) => {
    if (!product) {
      onPatch(
        recalcPurchaseLine({
          ...line,
          lineKind: 'product',
          productId: '',
          product: '',
          description: '',
          sku: '',
          unitOfMeasure: 'unidad',
          customUnit: '',
          unitPrice: '$0',
        }),
      )
      return
    }
    onPatch(purchaseLineFromProduct(product, line.id))
  }

  const patchRecalc = (patch: Partial<PurchaseLineItem>) => {
    onPatch(recalcPurchaseLine({ ...line, ...patch }))
  }

  const setLineKind = (nextKind: 'product' | 'manual') => {
    if (nextKind === kind) return
    if (nextKind === 'manual') {
      onPatch(
        recalcPurchaseLine({
          ...line,
          lineKind: 'manual',
          productId: undefined,
          sku: undefined,
          product: line.product || line.description || '',
          description: line.description || line.product || '',
        }),
      )
    } else {
      onPatch(
        recalcPurchaseLine({
          ...line,
          lineKind: 'product',
          productId: '',
          product: '',
          description: '',
          sku: '',
        }),
      )
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/15 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Línea {index + 1}
          </span>
          <Badge variant={isManual ? 'secondary' : 'outline'}>
            {isManual ? 'Ítem manual' : 'Producto'}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-destructive"
          disabled={!canRemove}
          aria-label="Eliminar línea"
          onClick={onRemove}
        >
          <Trash2 aria-hidden className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={kind === 'product' ? 'default' : 'outline'}
          onClick={() => setLineKind('product')}
        >
          Del catálogo
        </Button>
        <Button
          type="button"
          size="sm"
          variant={kind === 'manual' ? 'default' : 'outline'}
          onClick={() => setLineKind('manual')}
        >
          Servicio / otro
        </Button>
      </div>

      {isManual ? (
        <>
          <ContactFormInput
            id={`${idPrefix}-li-desc-${line.id}`}
            label="Descripción"
            inputVariant="alphanumeric"
            value={purchaseLineDescription(line)}
            placeholder="Ej. Flete, instalación, seguro…"
            onChange={(text) =>
              patchRecalc({
                lineKind: 'manual',
                product: text,
                description: text,
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Los ítems manuales figuran en la OC pero no generan ingreso a inventario.
          </p>
        </>
      ) : (
        <>
          <ProductLookupField
            label="Producto"
            value={line.productId ?? ''}
            productName={line.product}
            productSku={line.sku}
            onChange={handleProductChange}
          />
          <div className="grid gap-3 rounded-md border border-dashed border-border/80 bg-muted/25 p-3 sm:grid-cols-3">
            <ReadOnlyField label="SKU" value={line.sku ?? ''} />
            <ReadOnlyField label="Unidad" value={unitDisplay} />
            <ReadOnlyField
              label="Descripción"
              value={purchaseLineDescription(line)}
            />
          </div>
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ContactFormInput
          id={`${idPrefix}-li-qty-${line.id}`}
          label="Unidades solicitadas"
          inputVariant="integer"
          value={String(line.quantity)}
          onChange={(v) =>
            patchRecalc({ quantity: Math.max(1, Number.parseInt(v, 10) || 1) })
          }
        />
        <ContactFormInput
          id={`${idPrefix}-li-price-${line.id}`}
          label="Precio unitario"
          inputVariant="amount"
          value={line.unitPrice}
          onChange={(unitPrice) => patchRecalc({ unitPrice })}
        />
        <ContactFormInput
          id={`${idPrefix}-li-disc-${line.id}`}
          label="Descuento"
          inputVariant="percent"
          value={line.discount}
          onChange={(discount) => patchRecalc({ discount })}
        />
      </div>

      <p className="text-right text-sm font-semibold tabular-nums text-foreground">
        Total línea: {line.total}
      </p>
    </div>
  )
}
