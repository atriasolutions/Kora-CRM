import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'

import {
  QuoteFormFields,
  type QuoteFormFieldsModel,
} from '@/components/quotes/QuoteFormFields'
import { QuoteBankPdfFields } from '@/components/quotes/QuoteBankPdfFields'
import { QuoteCommercialTermsFields } from '@/components/quotes/QuoteCommercialTermsFields'
import { QuoteLineItemsEditor } from '@/components/quotes/QuoteLineItemsEditor'
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
import type { OpportunityListItem } from '@/data/opportunities.mock'
import {
  createDefaultQuoteFormValues,
  quoteFormPatchFromOpportunity,
  validateCreateQuoteForm,
  type CreateQuoteFormValues,
} from '@/lib/quote-create'
import { computeQuoteTotals, isManualQuoteLine, recalcQuoteLine, recalcQuoteLinesWithRates } from '@/lib/quote-line-item'
import { useProductsRegistry } from '@/hooks/use-products-registry'
import { useCatalogSettings } from '@/hooks/use-catalog-settings'
import { useExchangeRatesForDate } from '@/hooks/use-exchange-rates-for-date'
import { defaultSaleCustomerValues } from '@/lib/sale-customer'
import type { QuoteFormValues } from '@/lib/quote-form'

type CreateQuoteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  initialValues?: Partial<CreateQuoteFormValues>
  onSubmit: (values: CreateQuoteFormValues) => void
}

function toQuoteFormFieldsModel(form: CreateQuoteFormValues): QuoteFormFieldsModel {
  return {
    code: form.code,
    title: form.title,
    status: form.status,
    validUntil: form.validUntil,
    ownerName: form.ownerName,
    customerKind: form.customerKind,
    contactId: form.contactId,
    contactName: form.contactName,
    companyId: form.companyId,
    companyName: form.companyName,
    opportunityId: form.opportunityId,
    opportunityName: form.opportunityName,
    contactEmail: '',
    description: '',
    paymentTerms: '',
    deliveryTerms: '',
    billingAddress: '',
    destinationWarehouseId: form.destinationWarehouseId,
    destinationWarehouse: form.destinationWarehouse,
    deliveryAddress: form.deliveryAddress,
    terms: '',
    internalNotes: '',
    includeBankDetails: form.includeBankDetails,
    bankAccountId: form.bankAccountId,
    globalDiscountPercent: form.globalDiscountPercent,
    issueDate: form.issueDate,
    quoteCurrency: form.quoteCurrency,
  }
}

export function CreateQuoteDialog({
  open,
  onOpenChange,
  title = 'Nueva cotización',
  description,
  initialValues,
  onSubmit,
}: CreateQuoteDialogProps) {
  const [form, setForm] = useState(() => createDefaultQuoteFormValues(initialValues))
  const { reloadFromApi: reloadProducts } = useProductsRegistry()
  const { reloadCatalog } = useCatalogSettings()
  const { rates: exchangeRates, loading: ratesLoading } = useExchangeRatesForDate(form.issueDate)

  const displayLineItems = useMemo(
    () => recalcQuoteLinesWithRates(form.lineItems, exchangeRates, { skipWhileLoading: ratesLoading }),
    [form.lineItems, exchangeRates, ratesLoading],
  )

  const totals = useMemo(
    () =>
      computeQuoteTotals(displayLineItems, {
        globalDiscountPercent: form.globalDiscountPercent,
      }),
    [displayLineItems, form.globalDiscountPercent],
  )

  useEffect(() => {
    if (!open) return
    void reloadProducts().catch(() => {})
    void reloadCatalog().catch(() => {})
    queueMicrotask(() => {
      setForm(createDefaultQuoteFormValues(initialValues))
    })
  }, [open, initialValues, reloadProducts, reloadCatalog])

  const handleFormChange = useCallback((patch: Partial<QuoteFormValues>) => {
    setForm((current) => {
      const next = { ...current, ...patch }
      if (patch.quoteCurrency) {
        next.lineItems = current.lineItems.map((line) =>
          isManualQuoteLine(line)
            ? recalcQuoteLine(
                {
                  ...line,
                  priceCurrency: patch.quoteCurrency!,
                  unitPriceOriginalNum: 0,
                  unitPriceOriginal: undefined,
                  unitPrice: '$0',
                },
                exchangeRates,
              )
            : line,
        )
      }
      return next
    })
  }, [exchangeRates])

  const handleOpportunityChange = useCallback(
    (_opportunityId: string, opportunity?: OpportunityListItem) => {
      if (!opportunity) {
        setForm((f) => ({
          ...f,
          opportunityId: '',
          opportunityName: '',
          ...defaultSaleCustomerValues(),
        }))
        return
      }
      setForm((f) => ({
        ...f,
        ...quoteFormPatchFromOpportunity(opportunity, {
          fillCodeAndTitle: !f.opportunityId.trim(),
        }),
      }))
    },
    [],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: CreateQuoteFormValues = {
      ...form,
      lineItems: displayLineItems,
      amount: totals.amount,
    }
    const validation = validateCreateQuoteForm(payload)
    if (validation) {
      toast.warning(validation)
      return
    }
    onSubmit(payload)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex max-h-[min(92dvh,calc(100vh-2rem))] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl sm:w-full top-[4dvh] translate-y-0">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-4 py-4 sm:px-6">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
            <QuoteFormFields
              form={toQuoteFormFieldsModel(form)}
              readOnlyOpportunity={form.lockOpportunity}
              onOpportunityChange={form.lockOpportunity ? undefined : handleOpportunityChange}
              onChange={handleFormChange}
            />

            <QuoteLineItemsEditor
              lineItems={displayLineItems}
              exchangeRates={exchangeRates}
              defaultCurrency={form.quoteCurrency}
              onChange={(lineItems) =>
                setForm((f) => ({
                  ...f,
                  lineItems,
                  amount: computeQuoteTotals(lineItems, {
                    globalDiscountPercent: f.globalDiscountPercent,
                  }).amount,
                }))
              }
            />

            <DocumentGlobalDiscountField
              id="create-qt-global-discount"
              value={form.globalDiscountPercent}
              onChange={(globalDiscountPercent) =>
                setForm((f) => ({
                  ...f,
                  globalDiscountPercent,
                  amount: computeQuoteTotals(f.lineItems, { globalDiscountPercent }).amount,
                }))
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
              idPrefix="create-qt"
              values={{
                paymentTerms: form.paymentTerms,
                deliveryTerms: form.deliveryTerms,
                terms: form.terms,
              }}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            />

            <QuoteBankPdfFields
              idPrefix="create-qt-bank"
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
            <Button type="submit">Crear cotización</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
