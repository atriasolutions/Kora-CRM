import { FileSpreadsheet, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'

import {
  ContactFormDateInput,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { InvoiceLineItemsEditor } from '@/components/invoices/InvoiceLineItemsEditor'
import { DocumentGlobalDiscountField } from '@/components/shared/DocumentGlobalDiscountField'
import { DocumentTotalsBreakdown } from '@/components/shared/DocumentTotalsBreakdown'
import { QuoteLookupField } from '@/components/shared/QuoteLookupField'
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
import { INVOICE_PAYMENT_METHOD_OPTIONS } from '@/data/invoices.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import {
  applyQuoteToInvoiceForm,
  createDefaultInvoiceFormValues,
  syncInvoiceFormAmount,
  validateCreateInvoiceForm,
  type CreateInvoiceFormValues,
  type InvoiceSourceMode,
} from '@/lib/invoice-create'
import { computeInvoiceTotals } from '@/lib/invoice-line-item'
import { cn } from '@/lib/utils'

type CreateInvoiceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  initialValues?: Partial<CreateInvoiceFormValues>
  onSubmit: (values: CreateInvoiceFormValues) => void
}

const sourceOptions: {
  id: InvoiceSourceMode
  label: string
  hint: string
  Icon: typeof Wallet
}[] = [
  {
    id: 'cotizacion',
    label: 'Desde cotización',
    hint: 'Precarga cliente y líneas',
    Icon: FileSpreadsheet,
  },
  {
    id: 'directa',
    label: 'Factura directa',
    hint: 'B2B o B2C sin cotización',
    Icon: Wallet,
  },
]

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  title = 'Nueva factura',
  description,
  initialValues,
  onSubmit,
}: CreateInvoiceDialogProps) {
  const [form, setForm] = useState(() => createDefaultInvoiceFormValues(initialValues))

  const lockSource = Boolean(initialValues?.lockQuote)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(createDefaultInvoiceFormValues(initialValues))
    })
  }, [open, initialValues])

  const patch = (partial: Partial<CreateInvoiceFormValues>) => {
    setForm((prev) => {
      const next = { ...prev, ...partial }
      if (partial.lineItems || partial.globalDiscountPercent !== undefined) {
        const lineItems = partial.lineItems ?? next.lineItems
        const globalDiscountPercent =
          partial.globalDiscountPercent ?? next.globalDiscountPercent
        return {
          ...next,
          ...syncInvoiceFormAmount(lineItems, globalDiscountPercent),
        }
      }
      return next
    })
  }

  const setSourceMode = (invoiceSource: InvoiceSourceMode) => {
    if (lockSource) return
    if (invoiceSource === form.invoiceSource) return
    patch({
      invoiceSource,
      quoteId: invoiceSource === 'directa' ? '' : form.quoteId,
      quoteCode: invoiceSource === 'directa' ? undefined : form.quoteCode,
      lockQuote: invoiceSource === 'cotizacion' ? form.lockQuote : false,
    })
  }

  const handleQuoteChange = (quoteId: string) => {
    if (!quoteId.trim()) {
      patch({ quoteId: '', quoteCode: undefined })
      return
    }
    patch({ quoteId, ...applyQuoteToInvoiceForm(quoteId, form) })
  }

  const showCustomerFields = form.invoiceSource === 'directa' || !form.lockQuote
  const customerDisabled = form.invoiceSource === 'cotizacion' && Boolean(form.lockQuote)

  const totals = useMemo(
    () =>
      computeInvoiceTotals(form.lineItems, {
        globalDiscountPercent: form.globalDiscountPercent,
      }),
    [form.lineItems, form.globalDiscountPercent],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateCreateInvoiceForm(form)
    if (validation) {
      toast.warning(validation)
      return
    }
    onSubmit(form)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ??
              'Emite una factura desde cotización o de forma directa con líneas editables.'}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {!lockSource ? (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Origen</p>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
                {sourceOptions.map(({ id, label, hint, Icon }) => {
                  const active = form.invoiceSource === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSourceMode(id)}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
                        active
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/40',
                      )}
                    >
                      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>
                        <span className="block text-sm font-medium text-foreground">{label}</span>
                        <span className="block text-xs text-muted-foreground">{hint}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {form.invoiceSource === 'cotizacion' ? (
            <QuoteLookupField
              value={form.quoteId}
              quoteCode={form.quoteCode}
              onChange={(id) => handleQuoteChange(id)}
              disabled={form.lockQuote}
              acceptedOnly={!form.lockQuote}
            />
          ) : null}

          {showCustomerFields ? (
            <SaleCustomerFields
              values={{
                customerKind: form.customerKind,
                contactId: form.contactId,
                contactName: form.contactName,
                companyId: form.companyId,
                companyName: form.companyName,
              }}
              onChange={(customerPatch) => patch(customerPatch)}
              disabled={customerDisabled}
            />
          ) : null}

          <InvoiceLineItemsEditor
            lineItems={form.lineItems}
            onChange={(lineItems) => patch({ lineItems })}
          />

          <DocumentGlobalDiscountField
            id="inv-global-discount"
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
            id="inv-amount"
            label="Monto total (con IVA)"
            value={form.amount}
            disabled
            onChange={() => {}}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <ContactFormDateInput
              id="inv-issue"
              label="Fecha de emisión"
              value={form.issueDate}
              onChange={(issueDate) => patch({ issueDate })}
            />
            <ContactFormDateInput
              id="inv-due"
              label="Fecha de vencimiento"
              value={form.dueDate}
              onChange={(dueDate) => patch({ dueDate })}
            />
          </div>
          <ContactFormSelect
            id="inv-payment"
            label="Medio de pago"
            value={form.paymentMethod}
            onChange={(paymentMethod) =>
              patch({
                paymentMethod: paymentMethod as CreateInvoiceFormValues['paymentMethod'],
              })
            }
            options={INVOICE_PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m, label: m }))}
          />
          <p className="text-xs text-muted-foreground">
            La factura se crea en estado <strong className="font-medium">Borrador</strong>. Avanza
            el cobro desde la ruta del éxito en el detalle.
          </p>
          <UserLookupField
            label="Responsable"
            value={form.ownerName}
            onChange={(ownerName) => patch({ ownerName })}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear factura</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
