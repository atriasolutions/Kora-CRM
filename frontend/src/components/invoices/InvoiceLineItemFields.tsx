import { Trash2 } from 'lucide-react'

import {
  ContactFormCheckbox,
  ContactFormInput,
} from '@/components/contacts/ContactFormField'
import { ProductLookupField } from '@/components/shared/ProductLookupField'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { InvoiceLineItem } from '@/data/invoice-detail.mock'
import type { ProductListItem } from '@/data/products.mock'
import {
  invoiceLineFromProduct,
  invoiceLineKind,
  invoiceLineSubjectToVat,
  isManualInvoiceLine,
  recalcInvoiceLine,
} from '@/lib/invoice-line-item'

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

type InvoiceLineItemFieldsProps = {
  line: InvoiceLineItem
  index: number
  idPrefix: string
  canRemove: boolean
  onPatch: (line: InvoiceLineItem) => void
  onRemove: () => void
}

export function InvoiceLineItemFields({
  line,
  index,
  idPrefix,
  canRemove,
  onPatch,
  onRemove,
}: InvoiceLineItemFieldsProps) {
  const kind = invoiceLineKind(line)
  const isManual = isManualInvoiceLine(line)

  const patchRecalc = (patch: Partial<InvoiceLineItem>) => {
    onPatch(recalcInvoiceLine({ ...line, ...patch }))
  }

  const handleProductChange = (_productId: string, product?: ProductListItem) => {
    if (!product) {
      onPatch(
        recalcInvoiceLine({
          ...line,
          lineKind: 'product',
          productId: '',
          sku: '',
          description: '',
          unitPrice: '$0',
        }),
      )
      return
    }
    onPatch(invoiceLineFromProduct(product, line.id))
  }

  const setLineKind = (nextKind: 'product' | 'manual') => {
    if (nextKind === kind) return
    if (nextKind === 'manual') {
      onPatch(
        recalcInvoiceLine({
          ...line,
          lineKind: 'manual',
          productId: undefined,
          sku: '',
          description: line.description.trim(),
        }),
      )
    } else {
      onPatch(
        recalcInvoiceLine({
          ...line,
          lineKind: 'product',
          productId: '',
          sku: '',
          description: '',
          unitPrice: '$0',
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
            {isManual ? 'Servicio / otro' : 'Producto'}
          </Badge>
        </div>
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
            id={`${idPrefix}-desc-${line.id}`}
            label="Descripción"
            inputVariant="alphanumeric"
            value={line.description}
            placeholder="Ej. Instalación, capacitación, flete…"
            onChange={(description) =>
              patchRecalc({ lineKind: 'manual', description, productId: undefined })
            }
          />
          <p className="text-xs text-muted-foreground">
            Conceptos fuera del catálogo de productos (servicios, arriendos, etc.).
          </p>
        </>
      ) : (
        <>
          <ProductLookupField
            label="Producto"
            value={line.productId ?? ''}
            productName={line.description}
            productSku={line.sku}
            onChange={handleProductChange}
          />
          <div className="grid gap-3 rounded-md border border-dashed border-border/80 bg-muted/25 p-3 sm:grid-cols-2">
            <ReadOnlyField label="SKU" value={line.sku} />
            <ReadOnlyField label="Descripción" value={line.description} />
          </div>
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isManual ? (
          <ContactFormInput
            id={`${idPrefix}-sku-${line.id}`}
            label="SKU / código (opcional)"
            inputVariant="alphanumeric"
            value={line.sku}
            onChange={(sku) => patchRecalc({ sku })}
          />
        ) : null}
        <ContactFormInput
          id={`${idPrefix}-qty-${line.id}`}
          label="Cantidad"
          inputVariant="integer"
          value={String(line.quantity)}
          onChange={(raw) => {
            const quantity = Math.max(1, Number.parseInt(raw, 10) || 1)
            patchRecalc({ quantity })
          }}
        />
        <ContactFormInput
          id={`${idPrefix}-price-${line.id}`}
          label="Precio unit."
          inputVariant="amount"
          value={line.unitPrice}
          onChange={(unitPrice) => patchRecalc({ unitPrice })}
        />
        <ContactFormInput
          id={`${idPrefix}-disc-${line.id}`}
          label="Descuento"
          inputVariant="percent"
          value={line.discount}
          onChange={(discount) => patchRecalc({ discount })}
        />
        <ContactFormInput
          id={`${idPrefix}-total-${line.id}`}
          label="Total línea"
          value={line.total}
          disabled
          onChange={() => {}}
        />
      </div>

      <ContactFormCheckbox
        id={`${idPrefix}-vat-${line.id}`}
        label="Afecto a IVA"
        description={
          invoiceLineSubjectToVat(line)
            ? 'Se incluye en el neto afecto'
            : 'Línea exenta de IVA'
        }
        checked={invoiceLineSubjectToVat(line)}
        onChange={(subjectToVat) => patchRecalc({ subjectToVat })}
      />
    </div>
  )
}
