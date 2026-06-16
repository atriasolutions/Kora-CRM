import {
  ContactFormDateInput,
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExchangeRatesPanel } from '@/components/shared/ExchangeRatesPanel'
import { Separator } from '@/components/ui/separator'
import type { InvoiceDetail } from '@/data/invoice-detail.mock'
import type { InvoicePaymentMethod } from '@/data/invoices.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import { SaleCustomerFields } from '@/components/shared/SaleCustomerFields'
import {
  INVOICE_PAYMENT_METHOD_OPTIONS,
  type InvoiceFormValues,
} from '@/lib/invoice-form'
import { Link } from 'react-router-dom'

import {
  formatSiiInvoiceNumberDisplay,
  invoiceRequiresSiiNumber,
} from '@/lib/invoice-sii'
import {
  dteTypeLabel,
  documentKindLabel,
  previewDteBreakdown,
  referenceCodeLabel,
  resolvePreviewInvoiceDteType,
} from '@/lib/invoice-dte'
import { useOrganizationSettings } from '@/hooks/use-organization-settings'

type InvoiceDetailSidebarProps = {
  invoice: InvoiceDetail
  isEditing?: boolean
  form?: InvoiceFormValues
  onFormChange?: (patch: Partial<InvoiceFormValues>) => void
}

export function InvoiceDetailSidebar({
  invoice,
  isEditing = false,
  form,
  onFormChange,
}: InvoiceDetailSidebarProps) {
  const { settings: orgSettings } = useOrganizationSettings()
  const invoicingMode = orgSettings.invoicingMode ?? 'manual'
  const previewDte =
    invoice.dteType ??
    (invoice.documentKind === 'credit_note'
      ? 61
      : invoice.documentKind === 'debit_note'
        ? 56
        : resolvePreviewInvoiceDteType(invoice.lineItems ?? []))
  const draftBreakdown =
    invoice.status === 'Borrador' && invoice.lineItems?.length
      ? previewDteBreakdown(invoice.lineItems, {
          globalDiscountPercent: invoice.globalDiscount ?? invoice.discountPercent,
        })
      : null

  const patch = (partial: Partial<InvoiceFormValues>) => {
    onFormChange?.(partial)
  }

  if (isEditing && form) {
    return (
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="border-primary/20 shadow-sm ring-1 ring-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Cobro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
            <ContactFormSelect
              id="edit-inv-payment"
              label="Medio de pago"
              value={form.paymentMethod}
              onChange={(paymentMethod) =>
                patch({ paymentMethod: paymentMethod as InvoicePaymentMethod })
              }
              options={INVOICE_PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m, label: m }))}
            />
            <UserLookupField
              label="Responsable"
              value={form.ownerName}
              onChange={(ownerName) => patch({ ownerName })}
            />
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-sm ring-1 ring-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Detalle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
              inputVariant="amount"
              value={form.amount}
              onChange={(amount) => patch({ amount })}
            />
            <ContactFormInput
              id="edit-inv-quote"
              label="Cotización (ID)"
              value={form.quoteId}
              onChange={(quoteId) => patch({ quoteId })}
            />
            <ContactFormField id="edit-inv-notes" label="Notas internas">
              <textarea
                id="edit-inv-notes"
                rows={4}
                value={form.notes}
                onChange={(e) => patch({ notes: e.target.value })}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </ContactFormField>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Vínculo CRM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Cliente: </span>
            <span className="font-medium">{invoice.client}</span>
          </p>
          {(invoice.customerKind ?? (invoice.contactId ? 'contacto' : 'empresa')) ===
          'contacto' && invoice.contactId ? (
            <p>
              <span className="text-muted-foreground">Contacto: </span>
              <Link
                to={`/contactos/${invoice.contactId}`}
                className="font-medium text-primary hover:underline"
              >
                {invoice.contactName ?? 'Ver contacto'}
              </Link>
            </p>
          ) : null}
          {(invoice.customerKind ?? 'empresa') === 'empresa' && invoice.companyId ? (
            <p>
              <span className="text-muted-foreground">Empresa: </span>
              <Link
                to={`/empresas/${invoice.companyId}`}
                className="font-medium text-primary hover:underline"
              >
                {invoice.companyName ?? 'Ver ficha'}
              </Link>
            </p>
          ) : null}
          {invoice.quoteId && invoice.quoteCode ? (
            <p>
              <span className="text-muted-foreground">Cotización: </span>
              <Link
                to={`/cotizaciones/${invoice.quoteId}`}
                className="font-medium text-primary hover:underline"
              >
                {invoice.quoteCode}
              </Link>
            </p>
          ) : null}
          <Separator />
          <p>
            <span className="text-muted-foreground">Responsable: </span>
            <span className="font-medium">{invoice.owner}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Totales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Neto afecto: </span>
            {invoice.taxableSubtotal ?? invoice.subtotal}
          </p>
          {invoice.exemptSubtotal && invoice.exemptSubtotal !== '$0' ? (
            <p>
              <span className="text-muted-foreground">Neto exento: </span>
              {invoice.exemptSubtotal}
            </p>
          ) : null}
          <p>
            <span className="text-muted-foreground">Subtotal líneas: </span>
            {invoice.subtotal}
          </p>
          {invoice.discountAmount &&
          invoice.discountAmount !== '$0' &&
          invoice.discountAmount !== '−$0' &&
          invoice.discountAmount !== '-$0' ? (
            <p>
              <span className="text-muted-foreground">
                Descuento global
                {invoice.discountPercent ? ` (${invoice.discountPercent})` : ''}:{' '}
              </span>
              <span className="text-destructive">{invoice.discountAmount}</span>
            </p>
          ) : null}
          <p>
            <span className="text-muted-foreground">IVA ({invoice.taxPercent}): </span>
            {invoice.taxAmount}
          </p>
          <p>
            <span className="text-muted-foreground">Total: </span>
            <span className="font-semibold">{invoice.amount}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Saldo pendiente: </span>
            <span className="font-semibold">{invoice.balanceDue}</span>
          </p>
          <ExchangeRatesPanel rates={invoice} className="mt-3 border-0 bg-muted/30 shadow-none" />
        </CardContent>
      </Card>

      {invoice.sourceInvoice ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Documento origen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <Link
                to={`/facturacion/${invoice.sourceInvoice.id}`}
                className="font-mono font-medium text-primary hover:underline"
              >
                {invoice.sourceInvoice.number}
              </Link>
            </p>
            {invoice.sourceInvoice.siiNumber ? (
              <p>
                <span className="text-muted-foreground">Folio SII: </span>
                {formatSiiInvoiceNumberDisplay(invoice.sourceInvoice.siiNumber)}
              </p>
            ) : null}
            {invoice.referenceReason ? (
              <p>
                <span className="text-muted-foreground">Motivo: </span>
                {invoice.referenceReason}
              </p>
            ) : null}
            {invoice.referenceCode ? (
              <p>
                <span className="text-muted-foreground">Referencia: </span>
                {referenceCodeLabel(invoice.referenceCode)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {invoiceRequiresSiiNumber(invoice.status) ||
      (invoice.status === 'Borrador' && invoicingMode === 'sii') ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Tributario (SII)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Documento: </span>
              {documentKindLabel(invoice.documentKind)}
            </p>
            <p>
              <span className="text-muted-foreground">Tipo DTE: </span>
              <span className="font-medium">
                {dteTypeLabel(previewDte, invoice.documentKind)}
              </span>
            </p>
            {invoice.siiNumber ? (
              <p>
                <span className="text-muted-foreground">Folio DTE: </span>
                <span className="font-mono font-semibold">
                  {formatSiiInvoiceNumberDisplay(invoice.siiNumber)}
                </span>
              </p>
            ) : invoice.status === 'Borrador' ? (
              <>
                {draftBreakdown ? (
                  <>
                    <p>
                      <span className="text-muted-foreground">Neto afecto: </span>
                      {draftBreakdown.taxableSubtotal}
                    </p>
                    {draftBreakdown.exemptSubtotal !== '$0' ? (
                      <p>
                        <span className="text-muted-foreground">Neto exento: </span>
                        {draftBreakdown.exemptSubtotal}
                      </p>
                    ) : null}
                    <p>
                      <span className="text-muted-foreground">IVA: </span>
                      {draftBreakdown.taxAmount}
                    </p>
                  </>
                ) : null}
                <p className="text-muted-foreground">
                  Sin folio SII. Se asignará al emitir el documento.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                Sin folio SII. Se solicita al pasar a estado emitida.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Fechas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Emisión: </span>
            {invoice.issueDate}
          </p>
          <p>
            <span className="text-muted-foreground">Vencimiento: </span>
            {invoice.dueDate}
          </p>
          <p>
            <span className="text-muted-foreground">Medio de pago: </span>
            {invoice.paymentMethod}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
