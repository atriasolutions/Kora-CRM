import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'

import { quoteLineItemsLocked } from '@/api/quotes'
import { QuoteFormFields } from '@/components/quotes/QuoteFormFields'
import { QuoteBankPdfFields } from '@/components/quotes/QuoteBankPdfFields'
import { QuoteCommercialTermsFields } from '@/components/quotes/QuoteCommercialTermsFields'
import { QuoteLineItemsEditor } from '@/components/quotes/QuoteLineItemsEditor'
import { QuoteLineItemsPanel } from '@/components/quotes/QuoteLineItemsPanel'
import { DocumentGlobalDiscountField } from '@/components/shared/DocumentGlobalDiscountField'
import { DocumentTotalsBreakdown } from '@/components/shared/DocumentTotalsBreakdown'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { QuoteDetail, QuoteLineItem } from '@/data/quote-detail.mock'
import {
  applyFormValuesToQuote,
  quoteDetailToFormValues,
  type QuoteFormValues,
} from '@/lib/quote-form'
import { useProductsRegistry } from '@/hooks/use-products-registry'
import { useCatalogSettings } from '@/hooks/use-catalog-settings'
import { useExchangeRatesForDate } from '@/hooks/use-exchange-rates-for-date'
import {
  computeQuoteTotals,
  isManualQuoteLine,
  recalcQuoteLine,
  recalcQuoteLinesWithRates,
  validateQuoteLineItems,
} from '@/lib/quote-line-item'

type EditQuoteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: QuoteDetail
  onSave: (updated: QuoteDetail) => void | Promise<void>
}

export function EditQuoteDialog({ open, onOpenChange, quote, onSave }: EditQuoteDialogProps) {
  const [form, setForm] = useState<QuoteFormValues>(() => quoteDetailToFormValues(quote))
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>(() => quote.lineItems)
  const [saving, setSaving] = useState(false)
  const { reloadFromApi: reloadProducts } = useProductsRegistry()
  const { reloadCatalog } = useCatalogSettings()

  const linesLocked = quoteLineItemsLocked(quote.status)
  const { rates: exchangeRates, loading: ratesLoading } = useExchangeRatesForDate(form.issueDate)
  const globalDiscountPercent = form.globalDiscountPercent

  const displayLineItems = useMemo(
    () => recalcQuoteLinesWithRates(lineItems, exchangeRates, { skipWhileLoading: ratesLoading }),
    [lineItems, exchangeRates, ratesLoading],
  )

  const totals = useMemo(
    () =>
      computeQuoteTotals(displayLineItems, {
        globalDiscountPercent,
      }),
    [displayLineItems, globalDiscountPercent],
  )

  useEffect(() => {
    if (!open) return
    void reloadProducts().catch(() => {})
    void reloadCatalog().catch(() => {})
    queueMicrotask(() => {
      setForm(quoteDetailToFormValues(quote))
      setLineItems(quote.lineItems)
      setSaving(false)
    })
  }, [open, quote, reloadProducts, reloadCatalog])

  const handleFormChange = (patch: Partial<QuoteFormValues>) => {
    setForm((current) => ({ ...current, ...patch }))
    if (!linesLocked && patch.quoteCurrency) {
      setLineItems((items) =>
        items.map((line) =>
          isManualQuoteLine(line)
            ? recalcQuoteLine(
                {
                  ...line,
                  priceCurrency: patch.quoteCurrency,
                  unitPriceOriginalNum: 0,
                  unitPriceOriginal: undefined,
                  unitPrice: '$0',
                },
                exchangeRates,
              )
            : line,
        ),
      )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.warning('El título es obligatorio.')
      return
    }
    const itemsToSave = displayLineItems
    if (itemsToSave.length === 0) {
      toast.warning('Agrega al menos una línea a la cotización.')
      return
    }
    const lineValidation = validateQuoteLineItems(itemsToSave)
    if (lineValidation) {
      toast.warning(lineValidation)
      return
    }
    setSaving(true)
    try {
      await onSave(applyFormValuesToQuote(quote, form, itemsToSave))
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex max-h-[min(92dvh,calc(100vh-2rem))] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl sm:w-full top-[4dvh] translate-y-0">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-4 py-4 sm:px-6">
          <DialogTitle>Editar cotización</DialogTitle>
          <DialogDescription>
            Actualiza los datos y líneas de «{quote.title}». Los cambios se reflejan en el
            listado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
            <QuoteFormFields
              form={form}
              readOnlyOpportunity
              linkToOpportunity
              onChange={handleFormChange}
            />

            {linesLocked ? (
              <div className="space-y-2">
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  Esta cotización está <strong>Aceptada</strong>. Las líneas no se pueden modificar
                  (hay stock reservado). Puedes editar título, fechas y datos comerciales; para
                  cambiar líneas, mueve la cotización a otro estado primero.
                </p>
                <QuoteLineItemsPanel lineItems={displayLineItems} showAvailability />
              </div>
            ) : (
              <QuoteLineItemsEditor
                lineItems={displayLineItems}
                exchangeRates={exchangeRates}
                defaultCurrency={form.quoteCurrency}
                onChange={setLineItems}
              />
            )}

            <DocumentGlobalDiscountField
              id="edit-qt-global-discount"
              value={form.globalDiscountPercent}
              onChange={(globalDiscountPercent) =>
                setForm((f) => ({ ...f, globalDiscountPercent }))
              }
            />

            <DocumentTotalsBreakdown
              subtotal={totals.subtotal}
              discountPercent={totals.discountPercent}
              discountAmount={totals.discountAmount}
              taxLabel={`IVA (${totals.taxPercent})`}
              taxAmount={totals.taxAmount}
              total={totals.amount}
              totalLabel="Total cotización (IVA incl.)"
            />

            <QuoteCommercialTermsFields
              idPrefix="edit-qt"
              values={{
                paymentTerms: form.paymentTerms,
                deliveryTerms: form.deliveryTerms,
                terms: form.terms,
              }}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            />

            <QuoteBankPdfFields
              idPrefix="edit-qt-bank"
              values={{
                includeBankDetails: form.includeBankDetails,
                bankAccountId: form.bankAccountId,
              }}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            />
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/20 px-4 py-4 sm:px-6 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
