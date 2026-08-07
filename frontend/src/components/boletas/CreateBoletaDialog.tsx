import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'

import {
  ContactFormDateInput,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { InvoiceLineItemsEditor } from '@/components/invoices/InvoiceLineItemsEditor'
import { DocumentExchangeRatesSection } from '@/components/shared/DocumentExchangeRatesSection'
import { DocumentGlobalDiscountField } from '@/components/shared/DocumentGlobalDiscountField'
import { DocumentTotalsBreakdown } from '@/components/shared/DocumentTotalsBreakdown'
import { SaleCustomerFields } from '@/components/shared/SaleCustomerFields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BOLETA_PAYMENT_METHOD_OPTIONS } from '@/data/boletas.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import {
  createDefaultBoletaFormValues,
  syncBoletaFormAmount,
  validateCreateBoletaForm,
  type CreateBoletaFormValues,
} from '@/lib/boleta-create'
import {
  computeInvoiceTotals,
  invoiceLineCurrency,
  recalcInvoiceLinesWithRates,
} from '@/lib/invoice-line-item'
import { useExchangeRatesForDate } from '@/hooks/use-exchange-rates-for-date'

type CreateBoletaDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  initialValues?: Partial<CreateBoletaFormValues>
  onSubmit: (values: CreateBoletaFormValues) => void
}

export function CreateBoletaDialog({
  open,
  onOpenChange,
  title = 'Nueva boleta',
  description,
  initialValues,
  onSubmit,
}: CreateBoletaDialogProps) {
  const [form, setForm] = useState(() => createDefaultBoletaFormValues(initialValues))
  const { rates: exchangeRates, loading: ratesLoading } = useExchangeRatesForDate(
    form.issueDate,
  )

  const displayLineItems = useMemo(
    () =>
      recalcInvoiceLinesWithRates(form.lineItems, exchangeRates, {
        skipWhileLoading: ratesLoading,
      }),
    [form.lineItems, exchangeRates, ratesLoading],
  )

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(createDefaultBoletaFormValues(initialValues))
    })
  }, [open, initialValues])

  const patch = (partial: Partial<CreateBoletaFormValues>) => {
    setForm((prev) => {
      const next = { ...prev, ...partial }
      if (partial.lineItems || partial.globalDiscountPercent !== undefined) {
        const lineItems = partial.lineItems ?? next.lineItems
        const globalDiscountPercent =
          partial.globalDiscountPercent ?? next.globalDiscountPercent
        return {
          ...next,
          ...syncBoletaFormAmount(lineItems, globalDiscountPercent),
        }
      }
      return next
    })
  }

  const totals = useMemo(
    () =>
      computeInvoiceTotals(displayLineItems, {
        globalDiscountPercent: form.globalDiscountPercent,
      }),
    [displayLineItems, form.globalDiscountPercent],
  )

  const lineCurrencies = useMemo(
    () => displayLineItems.map((line) => invoiceLineCurrency(line)),
    [displayLineItems],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: CreateBoletaFormValues = {
      ...form,
      lineItems: displayLineItems,
      amount: totals.amount,
    }
    const validation = validateCreateBoletaForm(payload)
    if (validation) {
      toast.warning(validation)
      return
    }
    onSubmit(payload)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ??
              'Registra una boleta de venta con líneas editables. El comprador es opcional.'}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ContactFormInput
              id="bol-buyer-name"
              label="Nombre comprador (opcional)"
              value={form.buyerName}
              onChange={(buyerName) => patch({ buyerName })}
            />
            <ContactFormInput
              id="bol-buyer-tax"
              label="RUT comprador (opcional)"
              value={form.buyerTaxId}
              onChange={(buyerTaxId) => patch({ buyerTaxId })}
            />
          </div>

          <SaleCustomerFields
            values={{
              customerKind: form.customerKind,
              contactId: form.contactId,
              contactName: form.contactName,
              companyId: form.companyId,
              companyName: form.companyName,
            }}
            onChange={(customerPatch) => patch(customerPatch)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <ContactFormDateInput
              id="bol-issue"
              label="Fecha de emisión"
              value={form.issueDate}
              onChange={(issueDate) => patch({ issueDate })}
            />
            <ContactFormSelect
              id="bol-payment"
              label="Medio de pago"
              value={form.paymentMethod}
              onChange={(paymentMethod) =>
                patch({ paymentMethod: paymentMethod as CreateBoletaFormValues['paymentMethod'] })
              }
              options={BOLETA_PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m, label: m }))}
            />
          </div>

          <DocumentExchangeRatesSection
            issueDate={form.issueDate}
            currencies={lineCurrencies}
          />

          <InvoiceLineItemsEditor
            title="Líneas de boleta"
            lineItems={displayLineItems}
            exchangeRates={exchangeRates}
            onChange={(lineItems) => patch({ lineItems })}
          />

          <DocumentGlobalDiscountField
            id="bol-global-discount"
            value={form.globalDiscountPercent}
            onChange={(globalDiscountPercent) => patch({ globalDiscountPercent })}
          />

          <DocumentTotalsBreakdown
            subtotal={totals.subtotal}
            discountPercent={totals.discountPercent}
            discountAmount={totals.discountAmount}
            taxLabel={`IVA (${totals.taxPercent})`}
            taxAmount={totals.taxAmount}
            total={totals.amount}
            totalLabel="Total (con IVA)"
          />

          <ContactFormInput
            id="bol-amount"
            label="Monto total (con IVA)"
            value={totals.amount}
            disabled
            onChange={() => {}}
          />

          <UserLookupField
            label="Responsable"
            value={form.ownerName}
            onChange={(ownerName) => patch({ ownerName })}
          />

          <ContactFormInput
            id="bol-notes"
            label="Notas internas (opcional)"
            value={form.notes}
            onChange={(notes) => patch({ notes })}
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear boleta</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
