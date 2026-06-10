import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'

import {
  QuoteFormFields,
  type QuoteFormFieldsModel,
} from '@/components/quotes/QuoteFormFields'
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
import { computeQuoteTotals } from '@/lib/quote-line-item'
import { useProductsRegistry } from '@/hooks/use-products-registry'
import { defaultSaleCustomerValues } from '@/lib/sale-customer'

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
    includeBankDetails: false,
    bankAccountId: '',
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

  const totals = useMemo(
    () =>
      computeQuoteTotals(form.lineItems, {
        globalDiscountPercent: form.globalDiscountPercent,
      }),
    [form.lineItems, form.globalDiscountPercent],
  )

  useEffect(() => {
    if (!open) return
    void reloadProducts().catch(() => {})
    queueMicrotask(() => {
      setForm(createDefaultQuoteFormValues(initialValues))
    })
  }, [open, initialValues, reloadProducts])

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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <QuoteFormFields
            form={toQuoteFormFieldsModel(form)}
            readOnlyOpportunity={form.lockOpportunity}
            onOpportunityChange={form.lockOpportunity ? undefined : handleOpportunityChange}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          />

          <QuoteLineItemsEditor
            lineItems={form.lineItems}
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

          <DialogFooter className="gap-2 border-t border-border pt-4 sm:gap-0">
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
