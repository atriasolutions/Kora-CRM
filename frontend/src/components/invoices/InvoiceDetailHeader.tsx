import {
  Building2,
  Calendar,
  CreditCard,
  MoreHorizontal,
  Pencil,
  UserRound,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { SaleCustomerFields } from '@/components/shared/SaleCustomerFields'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { InvoiceDetail } from '@/data/invoice-detail.mock'
import { invoiceStatusVariant } from '@/lib/invoice-display'
import { invoiceStageDisplayName } from '@/lib/invoice-journey'
import type { InvoiceJourneyStage } from '@/lib/invoice-journey'
import {
  INVOICE_PAYMENT_METHOD_OPTIONS,
  type InvoiceFormValues,
} from '@/lib/invoice-form'
import { RegisterActivityHeaderButton } from '@/components/shared/RegisterActivityHeaderButton'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import { saleCustomerDisplayName } from '@/lib/sale-customer'
import {
  formatSiiInvoiceNumberDisplay,
  invoiceRequiresSiiNumber,
} from '@/lib/invoice-sii'
import { dteTypeLabel, documentKindLabel, resolvePreviewInvoiceDteType } from '@/lib/invoice-dte'
import { useDetailHeaderPermissions } from '@/hooks/use-detail-header-permissions'
import { cn } from '@/lib/utils'

type InvoiceDetailHeaderProps = {
  invoice: InvoiceDetail
  isEditing?: boolean
  form?: InvoiceFormValues
  onFormChange?: (patch: Partial<InvoiceFormValues>) => void
  onStartEdit?: () => void
  onRegisterActivity?: (presetType?: ContactActivityType) => void
  onArchive?: () => void
  onCreateCreditNote?: () => void
  onCreateDebitNote?: () => void
}

export function InvoiceDetailHeader({
  invoice,
  isEditing = false,
  form,
  onFormChange,
  onStartEdit,
  onRegisterActivity,
  onArchive,
  onCreateCreditNote,
  onCreateDebitNote,
}: InvoiceDetailHeaderProps) {
  const { showEdit, showArchive } = useDetailHeaderPermissions('facturacion', {
    onStartEdit,
    onArchive,
  })

  const displayStatus = invoiceStageDisplayName(invoice.status as InvoiceJourneyStage)
  const previewDte =
    invoice.dteType ??
    (invoice.documentKind === 'credit_note'
      ? 61
      : invoice.documentKind === 'debit_note'
        ? 56
        : resolvePreviewInvoiceDteType(invoice.lineItems ?? []))
  const displayClient =
    isEditing && form
      ? saleCustomerDisplayName(form)
      : invoice.client
  const displayAmount = isEditing && form ? form.amount : invoice.amount

  const metrics = [
    { label: 'Total', value: displayAmount },
    { label: 'Subtotal', value: invoice.subtotal },
    { label: 'IVA', value: invoice.taxAmount },
    { label: 'Saldo', value: invoice.balanceDue },
    { label: 'Emisión', value: isEditing && form ? form.issueDate : invoice.issueDate },
    { label: 'Vencimiento', value: isEditing && form ? form.dueDate : invoice.dueDate },
  ]

  const patch = (partial: Partial<InvoiceFormValues>) => {
    onFormChange?.(partial)
  }

  const customerKind = invoice.customerKind ?? (invoice.contactId ? 'contacto' : 'empresa')
  const showAdjustments = Boolean(onCreateCreditNote || onCreateDebitNote)

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm',
        isEditing ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border',
      )}
    >
      <div
        className={cn(
          'border-b border-border p-4 sm:p-5 lg:p-6',
          isEditing ? 'bg-primary/5' : 'bg-gradient-to-br from-muted/40 via-card to-card',
        )}
      >
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-gradient-to-br from-primary/10 to-chart-3/10 sm:size-16">
              <Wallet aria-hidden className="size-7 text-primary sm:size-8" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {isEditing && form ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
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
                  </div>
                  <ContactFormSelect
                    id="inv-header-payment"
                    label="Medio de pago"
                    value={form.paymentMethod}
                    onChange={(paymentMethod) =>
                      patch({
                        paymentMethod:
                          paymentMethod as InvoiceFormValues['paymentMethod'],
                      })
                    }
                    options={INVOICE_PAYMENT_METHOD_OPTIONS.map((m) => ({
                      value: m,
                      label: m,
                    }))}
                  />
                  <ContactFormInput
                    id="inv-header-amount"
                    label="Monto"
                    value={form.amount}
                    onChange={(amount) => patch({ amount })}
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">
                      {displayClient}
                    </h1>
                    <Badge variant={invoiceStatusVariant(invoice.status)}>
                      {displayStatus}
                    </Badge>
                    <Badge variant="outline">{documentKindLabel(invoice.documentKind)}</Badge>
                    <Badge variant="outline">
                      {dteTypeLabel(previewDte, invoice.documentKind)}
                    </Badge>
                  </div>
                  <p className="font-mono text-sm text-muted-foreground">{invoice.number}</p>
                  <p className="text-sm text-muted-foreground">
                    Responsable {invoice.owner}
                  </p>
                  {invoice.siiNumber && invoiceRequiresSiiNumber(invoice.status) ? (
                    <p className="font-mono text-sm text-foreground">
                      Folio SII:{' '}
                      <span className="font-semibold">
                        {formatSiiInvoiceNumberDisplay(invoice.siiNumber)}
                      </span>
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    {customerKind === 'contacto' && invoice.contactId ? (
                      <Link
                        to={`/contactos/${invoice.contactId}`}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <UserRound aria-hidden className="size-4" />
                        {invoice.contactName ?? 'Ver contacto'}
                      </Link>
                    ) : null}
                    {customerKind === 'empresa' && invoice.companyId ? (
                      <Link
                        to={`/empresas/${invoice.companyId}`}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <Building2 aria-hidden className="size-4" />
                        {invoice.companyName ?? 'Ver empresa'}
                      </Link>
                    ) : null}
                    {invoice.quoteId && invoice.quoteCode ? (
                      <Link
                        to={`/cotizaciones/${invoice.quoteId}`}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        Cotización: {invoice.quoteCode}
                      </Link>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          {!isEditing ? (
            <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/60 pt-4 2xl:w-auto 2xl:shrink-0 2xl:border-t-0 2xl:pt-0">
              <RegisterActivityHeaderButton onRegister={onRegisterActivity} />
              {showEdit ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border shadow-sm"
                  onClick={onStartEdit}
                >
                  <Pencil aria-hidden className="size-4" />
                  Editar
                </Button>
              ) : null}
              {showAdjustments || showArchive ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="border-border shadow-sm">
                      <MoreHorizontal aria-hidden className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {showAdjustments ? (
                      <>
                        {onCreateCreditNote ? (
                          <DropdownMenuItem onSelect={onCreateCreditNote}>
                            Nota de crédito
                          </DropdownMenuItem>
                        ) : null}
                        {onCreateDebitNote ? (
                          <DropdownMenuItem onSelect={onCreateDebitNote}>
                            Nota de débito
                          </DropdownMenuItem>
                        ) : null}
                        {showArchive ? <DropdownMenuSeparator /> : null}
                      </>
                    ) : null}
                    {showArchive ? (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={onArchive}
                      >
                        Archivar
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {!isEditing ? (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar aria-hidden className="size-4" />
              Vence {invoice.dueDate}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CreditCard aria-hidden className="size-4" />
              {invoice.paymentMethod}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  )
}
