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
import type { InvoiceDetail } from '@/data/invoice-detail.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import { useExchangeRatesForDate } from '@/hooks/use-exchange-rates-for-date'
import {
  computeInvoiceTotals,
  invoiceLineCurrency,
  recalcInvoiceLinesWithRates,
} from '@/lib/invoice-line-item'
import {
  applyFormValuesToInvoice,
  invoiceDetailToFormValues,
  INVOICE_PAYMENT_METHOD_OPTIONS,
  syncInvoiceEditFormAmount,
  type InvoiceFormValues,
} from '@/lib/invoice-form'
import { validateSaleCustomer } from '@/lib/sale-customer'
import {
  invoiceRequiresSiiNumber,
  validateSiiInvoiceNumber,
} from '@/lib/invoice-sii'

type EditInvoiceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: InvoiceDetail
  onSave: (updated: InvoiceDetail) => void
}

export function EditInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onSave,
}: EditInvoiceDialogProps) {
  const [form, setForm] = useState<InvoiceFormValues>(() =>
    invoiceDetailToFormValues(invoice),
  )
  const [saving, setSaving] = useState(false)
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
      setForm(invoiceDetailToFormValues(invoice))
      setSaving(false)
    })
  }, [open, invoice])

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

  const patch = (partial: Partial<InvoiceFormValues>) => {
    setForm((prev) => {
      const next = { ...prev, ...partial }
      if (partial.lineItems || partial.globalDiscountPercent !== undefined) {
        const lineItems = partial.lineItems ?? next.lineItems
        const globalDiscountPercent =
          partial.globalDiscountPercent ?? next.globalDiscountPercent
        return {
          ...next,
          ...syncInvoiceEditFormAmount(lineItems, globalDiscountPercent),
        }
      }
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const customerError = validateSaleCustomer(form)
    if (customerError) {
      toast.warning(customerError)
      return
    }
    if (displayLineItems.length === 0) {
      toast.warning('Agrega al menos una línea a la factura.')
      return
    }
    if (invoiceRequiresSiiNumber(form.status)) {
      const siiError = validateSiiInvoiceNumber(form.siiNumber)
      if (siiError) {
        toast.warning(siiError)
        return
      }
    }
    setSaving(true)
    const nextForm: InvoiceFormValues = {
      ...form,
      lineItems: displayLineItems,
      amount: totals.amount,
    }
    onSave(applyFormValuesToInvoice(invoice, nextForm))
    onOpenChange(false)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar factura</DialogTitle>
          <DialogDescription>
            Modifica cliente, líneas, descuentos y fechas de {invoice.client}. El estado se
            gestiona en la ruta del éxito.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
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
              id="edit-inv-issue"
              label="Fecha de emisión"
              value={form.issueDate}
              onChange={(issueDate) => patch({ issueDate })}
            />
            <ContactFormDateInput
              id="edit-inv-due"
              label="Fecha de vencimiento"
              value={form.dueDate}
              onChange={(dueDate) => patch({ dueDate })}
            />
          </div>

          <DocumentExchangeRatesSection
            issueDate={form.issueDate}
            currencies={lineCurrencies}
          />

          <InvoiceLineItemsEditor
            lineItems={displayLineItems}
            exchangeRates={exchangeRates}
            onChange={(lineItems) => patch({ lineItems })}
          />

          <DocumentGlobalDiscountField
            id="edit-inv-global-discount"
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
            id="edit-inv-amount"
            label="Monto total (con IVA)"
            value={totals.amount}
            disabled
            onChange={() => {}}
          />

          <ContactFormSelect
            id="edit-inv-payment"
            label="Medio de pago"
            value={form.paymentMethod}
            onChange={(paymentMethod) =>
              patch({ paymentMethod: paymentMethod as InvoiceFormValues['paymentMethod'] })
            }
            options={INVOICE_PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m, label: m }))}
          />
          <UserLookupField
            label="Responsable"
            value={form.ownerName}
            onChange={(ownerName) => patch({ ownerName })}
          />
          {invoiceRequiresSiiNumber(form.status) ? (
            <ContactFormInput
              id="edit-inv-sii"
              label="Folio SII (DTE)"
              value={form.siiNumber}
              onChange={(siiNumber) => patch({ siiNumber })}
              placeholder="Ej. 12345678"
            />
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
