import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import {
  ContactFormDateInput,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
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
import {
  applyFormValuesToInvoice,
  invoiceDetailToFormValues,
  INVOICE_PAYMENT_METHOD_OPTIONS,
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

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(invoiceDetailToFormValues(invoice))
      setSaving(false)
    })
  }, [open, invoice])

  const patch = (partial: Partial<InvoiceFormValues>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const customerError = validateSaleCustomer(form)
    if (customerError) {
      toast.warning(customerError)
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
    onSave(applyFormValuesToInvoice(invoice, form))
    onOpenChange(false)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar factura</DialogTitle>
          <DialogDescription>
            Modifica la factura de {invoice.client}: montos, fechas y cliente. El estado se
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
          <ContactFormInput
            id="edit-inv-amount"
            label="Monto"
            value={form.amount}
            onChange={(amount) => patch({ amount })}
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
