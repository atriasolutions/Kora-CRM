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
import type { BoletaDetail } from '@/data/boleta-detail.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import {
  computeInvoiceTotals,
  invoiceLineCurrency,
  recalcInvoiceLinesWithRates,
} from '@/lib/invoice-line-item'
import {
  applyFormValuesToBoleta,
  boletaDetailToFormValues,
  BOLETA_PAYMENT_METHOD_OPTIONS,
  syncBoletaEditFormAmount,
  type BoletaFormValues,
} from '@/lib/boleta-form'
import { useExchangeRatesForDate } from '@/hooks/use-exchange-rates-for-date'

type EditBoletaDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  boleta: BoletaDetail
  onSave: (updated: BoletaDetail) => void
}

export function EditBoletaDialog({
  open,
  onOpenChange,
  boleta,
  onSave,
}: EditBoletaDialogProps) {
  const [form, setForm] = useState<BoletaFormValues>(() => boletaDetailToFormValues(boleta))
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
      setForm(boletaDetailToFormValues(boleta))
      setSaving(false)
    })
  }, [open, boleta])

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

  const patch = (partial: Partial<BoletaFormValues>) => {
    setForm((prev) => {
      const next = { ...prev, ...partial }
      if (partial.lineItems || partial.globalDiscountPercent !== undefined) {
        const lineItems = partial.lineItems ?? next.lineItems
        const globalDiscountPercent =
          partial.globalDiscountPercent ?? next.globalDiscountPercent
        return {
          ...next,
          ...syncBoletaEditFormAmount(lineItems, globalDiscountPercent),
        }
      }
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (displayLineItems.length === 0) {
      toast.warning('Agrega al menos una línea a la boleta.')
      return
    }
    setSaving(true)
    const nextForm: BoletaFormValues = {
      ...form,
      lineItems: displayLineItems,
      amount: totals.amount,
    }
    onSave(applyFormValuesToBoleta(boleta, nextForm))
    onOpenChange(false)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar boleta</DialogTitle>
          <DialogDescription>
            Modifica comprador, líneas, descuentos y fechas de {boleta.buyerName}. El estado se
            gestiona en el detalle.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ContactFormInput
              id="edit-bol-buyer-name"
              label="Nombre comprador (opcional)"
              value={form.buyerName}
              onChange={(buyerName) => patch({ buyerName })}
            />
            <ContactFormInput
              id="edit-bol-buyer-tax"
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
              id="edit-bol-issue"
              label="Fecha de emisión"
              value={form.issueDate}
              onChange={(issueDate) => patch({ issueDate })}
            />
            <ContactFormSelect
              id="edit-bol-payment"
              label="Medio de pago"
              value={form.paymentMethod}
              onChange={(paymentMethod) =>
                patch({ paymentMethod: paymentMethod as BoletaFormValues['paymentMethod'] })
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
            id="edit-bol-global-discount"
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

          <UserLookupField
            label="Responsable"
            value={form.ownerName}
            onChange={(ownerName) => patch({ ownerName })}
          />

          <ContactFormInput
            id="edit-bol-notes"
            label="Notas internas"
            value={form.notes}
            onChange={(notes) => patch({ notes })}
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
