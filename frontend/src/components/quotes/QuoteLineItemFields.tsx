import { Trash2 } from 'lucide-react'

import {
  ContactFormCheckbox,
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { ProductLookupField } from '@/components/shared/ProductLookupField'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { QuoteLineItem } from '@/data/quote-detail.mock'
import type { ProductListItem } from '@/data/products.mock'
import {
  PRODUCT_CURRENCIES,
  PRODUCT_CURRENCY_LABELS,
  type ExchangeRateSnapshot,
  type ProductCurrency,
} from '@/lib/currency'
import { quoteLineCurrency } from '@/lib/quote-line-item'
import {
  isManualQuoteLine,
  quoteLineDescription,
  quoteLineFromProduct,
  quoteLineKind,
  quoteLineSubjectToVat,
  recalcQuoteLine,
} from '@/lib/quote-line-item'
import {
  formatProductPriceAmount,
  parseProductPrice,
  productPricePlaceholder,
  productPriceUsesDecimals,
} from '@/lib/product-currency-input'

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

type QuoteLineItemFieldsProps = {
  line: QuoteLineItem
  index: number
  idPrefix: string
  canRemove: boolean
  exchangeRates?: ExchangeRateSnapshot | null
  defaultCurrency?: ProductCurrency
  onPatch: (line: QuoteLineItem) => void
  onRemove: () => void
}

export function QuoteLineItemFields({
  line,
  index,
  idPrefix,
  canRemove,
  exchangeRates = null,
  defaultCurrency = 'CLP',
  onPatch,
  onRemove,
}: QuoteLineItemFieldsProps) {
  const kind = quoteLineKind(line)
  const isManual = isManualQuoteLine(line)
  const currency = quoteLineCurrency(line)

  const patchRecalc = (patch: Partial<QuoteLineItem>) => {
    onPatch(recalcQuoteLine({ ...line, ...patch }, exchangeRates))
  }

  const handleProductChange = (_productId: string, product?: ProductListItem) => {
    if (!product) {
      onPatch(
        recalcQuoteLine(
          {
            ...line,
            lineKind: 'product',
            productId: '',
            sku: '',
            description: '',
            priceCurrency: 'CLP',
            unitPriceOriginalNum: 0,
            unitPrice: '$0',
          },
          exchangeRates,
        ),
      )
      return
    }
    onPatch(quoteLineFromProduct(product, line.id, exchangeRates))
  }

  const setLineKind = (nextKind: 'product' | 'manual') => {
    if (nextKind === kind) return
    if (nextKind === 'manual') {
      onPatch(
        recalcQuoteLine(
          {
            ...line,
            lineKind: 'manual',
            productId: undefined,
            sku: '',
            description: quoteLineDescription(line),
            priceCurrency: defaultCurrency,
            unitPriceOriginalNum: 0,
            unitPriceOriginal: undefined,
            unitPrice: '$0',
          },
          exchangeRates,
        ),
      )
    } else {
      onPatch(
        recalcQuoteLine({
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
            aria-label="Quitar línea"
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
            inputVariant="text"
            value={line.description}
            placeholder="Ej. Instalación, capacitación, flete…"
            onChange={(description) =>
              patchRecalc({ lineKind: 'manual', description, productId: undefined, sku: '' })
            }
          />
          <p className="text-xs text-muted-foreground">
            Conceptos que no están en el catálogo (texto libre). Los productos tipo
            Servicio del catálogo se eligen con «Del catálogo».
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
          <p className="text-xs text-muted-foreground">
            Incluye productos físicos, digitales, suscripciones y servicios registrados en
            Productos. Al abrir el buscador verás el catálogo; escribe nombre o SKU para filtrar.
          </p>
          <div className="grid gap-3 rounded-md border border-dashed border-border/80 bg-muted/25 p-3 sm:grid-cols-2">
            <ReadOnlyField label="SKU" value={line.sku} />
            <ReadOnlyField label="Descripción" value={quoteLineDescription(line)} />
          </div>
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ContactFormInput
          id={`${idPrefix}-qty-${line.id}`}
          label="Cantidad"
          inputVariant="integer"
          value={line.quantity > 0 ? String(line.quantity) : ''}
          onChange={(raw) => {
            if (!raw.trim()) {
              patchRecalc({ quantity: 0 })
              return
            }
            const quantity = Number.parseInt(raw, 10)
            if (!Number.isFinite(quantity)) return
            patchRecalc({ quantity: Math.max(0, quantity) })
          }}
          onBlur={() => {
            if (line.quantity < 1) patchRecalc({ quantity: 1 })
          }}
        />
        {isManual ? (
          <>
            <ContactFormSelect
              id={`${idPrefix}-currency-${line.id}`}
              label="Moneda"
              value={currency}
              options={PRODUCT_CURRENCIES.map((value) => ({
                value,
                label: PRODUCT_CURRENCY_LABELS[value],
              }))}
              onChange={(value) =>
                patchRecalc({
                  priceCurrency: value as ProductCurrency,
                  unitPriceOriginalNum: 0,
                  unitPriceOriginal: undefined,
                  unitPrice: '$0',
                })
              }
            />
            <ContactFormInput
              id={`${idPrefix}-price-${line.id}`}
              label={`Precio unitario (${currency})`}
              inputVariant={productPriceUsesDecimals(currency) ? 'text' : 'amount'}
              value={
                currency === 'CLP'
                  ? line.unitPrice
                  : formatProductPriceAmount(
                      line.unitPriceOriginalNum ?? 0,
                      currency,
                      { allowEmpty: true },
                    )
              }
              placeholder={productPricePlaceholder(currency)}
              onChange={(raw) => {
                if (currency === 'CLP') {
                  patchRecalc({ priceCurrency: 'CLP', unitPrice: raw, unitPriceOriginalNum: undefined })
                  return
                }
                const unitPriceOriginalNum = parseProductPrice(raw, currency)
                patchRecalc({
                  priceCurrency: currency,
                  unitPriceOriginalNum,
                  unitPriceOriginal: formatProductPriceAmount(unitPriceOriginalNum, currency),
                })
              }}
              onBlur={() => {
                if (currency === 'CLP' && !String(line.unitPrice).replace(/[^\d]/g, '')) {
                  patchRecalc({ unitPrice: '$0' })
                }
              }}
            />
            {currency !== 'CLP' ? (
              <ReadOnlyField label="Precio CLP" value={line.unitPrice} />
            ) : null}
          </>
        ) : currency !== 'CLP' ? (
          <>
            <ReadOnlyField
              label={`Precio (${currency})`}
              value={line.unitPriceOriginal ?? '—'}
            />
            <ReadOnlyField label="Precio CLP" value={line.unitPrice} />
          </>
        ) : (
          <ReadOnlyField label="Precio unitario (CLP)" value={line.unitPrice} />
        )}
        <ContactFormInput
          id={`${idPrefix}-disc-${line.id}`}
          label="Descuento"
          inputVariant="percent"
          value={line.discount}
          onChange={(discount) => patchRecalc({ discount })}
        />
        <ContactFormField id={`${idPrefix}-total-${line.id}`} label="Total línea">
          <p className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-semibold tabular-nums">
            {line.total}
          </p>
        </ContactFormField>
      </div>

      <ContactFormCheckbox
        id={`${idPrefix}-vat-${line.id}`}
        label="Afecto a IVA"
        description={
          quoteLineSubjectToVat(line)
            ? 'Se incluye en el neto afecto'
            : 'Línea exenta de IVA'
        }
        checked={quoteLineSubjectToVat(line)}
        onChange={(subjectToVat) => patchRecalc({ subjectToVat })}
      />
      <ContactFormCheckbox
        id={`${idPrefix}-deferred-${line.id}`}
        label="Plazo entrega"
        checked={line.deferredPayment === true}
        onChange={(deferredPayment) =>
          patchRecalc({
            deferredPayment,
            deferredPaymentText: deferredPayment ? line.deferredPaymentText ?? '' : '',
          })
        }
      />
      {line.deferredPayment ? (
        <ContactFormInput
          id={`${idPrefix}-deferred-text-${line.id}`}
          label="Texto plazo entrega"
          placeholder="Ej. 30 días desde emisión"
          value={line.deferredPaymentText ?? ''}
          onChange={(deferredPaymentText) => patchRecalc({ deferredPaymentText })}
        />
      ) : null}
    </div>
  )
}
