import { stampRecordAuditOnCreate } from '@/lib/record-audit'
import type { InvoiceLineItem } from '@/data/invoice-detail.mock'
import type { QuoteDetail } from '@/data/quote-detail.mock'
import type {
  InvoiceListItem,
  InvoicePaymentMethod,
  InvoiceStatus,
} from '@/data/invoices.mock'
import { getQuoteDetail } from '@/data/quote-detail.mock'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import { parseAmountNum } from '@/lib/invoice-display'
import type { InvoiceDetailOverride } from '@/lib/invoice-detail-storage'
import {
  computeInvoiceTotals,
  defaultInvoiceLineItem,
  invoiceLinesFromQuote,
} from '@/lib/invoice-line-item'
import {
  defaultSaleCustomerValues,
  saleCustomerDisplayName,
  validateSaleCustomer,
  type SaleCustomerValues,
} from '@/lib/sale-customer'

export type InvoiceSourceMode = 'cotizacion' | 'directa'

export type CreateInvoiceFormValues = SaleCustomerValues & {
  invoiceSource: InvoiceSourceMode
  number: string
  amount: string
  issueDate: string
  dueDate: string
  ownerName: string
  status: InvoiceStatus
  paymentMethod: InvoicePaymentMethod
  quoteId: string
  quoteCode?: string
  lockQuote?: boolean
  lineItems: InvoiceLineItem[]
}

export function createDefaultInvoiceFormValues(
  partial?: Partial<CreateInvoiceFormValues>,
): CreateInvoiceFormValues {
  const lineItems =
    partial?.lineItems && partial.lineItems.length > 0
      ? partial.lineItems
      : [defaultInvoiceLineItem()]
  const totals = computeInvoiceTotals(lineItems)

  return {
    ...defaultSaleCustomerValues(partial),
    invoiceSource: partial?.quoteId || partial?.lockQuote ? 'cotizacion' : 'directa',
    number: '',
    amount: partial?.amount ?? totals.amount,
    issueDate: '',
    dueDate: '',
    ownerName: getDefaultOwnerName(),
    status: 'Borrador',
    paymentMethod: 'Transferencia',
    quoteId: '',
    lineItems,
    ...partial,
  }
}

export function duplicateInvoiceFormValues(
  source: InvoiceListItem,
  lineItems?: InvoiceLineItem[],
): CreateInvoiceFormValues {
  const baseNumber = source.number.replace(/ \(copia\)$/i, '')
  const items = lineItems?.length ? lineItems : [defaultInvoiceLineItem()]
  const totals = computeInvoiceTotals(items)
  return {
    invoiceSource: source.quoteId ? 'cotizacion' : 'directa',
    customerKind: source.customerKind ?? 'empresa',
    contactId: source.contactId ?? '',
    contactName: source.contactName ?? '',
    companyId: source.companyId ?? '',
    companyName: source.companyName ?? source.client,
    number: `${baseNumber}-COPIA`,
    amount: totals.amount,
    issueDate: source.issueDate,
    dueDate: source.dueDate,
    ownerName: source.owner,
    status: 'Borrador',
    paymentMethod: source.paymentMethod,
    quoteId: source.quoteId ?? '',
    lineItems: items,
  }
}

/** Número provisional hasta asignación en BD. */
export function generateInvoiceNumber(): string {
  const suffix = String(Date.now()).slice(-4)
  return `FAC-${new Date().getFullYear()}-${suffix}`
}

export function canInvoiceFromQuote(quote: Pick<QuoteDetail, 'status'>): boolean {
  return quote.status === 'Aceptada'
}

export function invoiceFormValuesFromQuote(
  quote: QuoteDetail,
): Partial<CreateInvoiceFormValues> {
  const customerKind = quote.customerKind ?? (quote.contactId ? 'contacto' : 'empresa')
  const lineItems = invoiceLinesFromQuote(quote)
  const totals = computeInvoiceTotals(lineItems)

  return {
    invoiceSource: 'cotizacion',
    customerKind,
    contactId: quote.contactId ?? '',
    contactName: quote.contactName,
    companyId: quote.companyId ?? '',
    companyName: quote.companyName,
    amount: totals.amount,
    issueDate: quote.issueDate,
    dueDate: quote.validUntil,
    ownerName: quote.owner,
    status: 'Borrador',
    paymentMethod: 'Transferencia',
    quoteId: quote.id,
    quoteCode: quote.code,
    lockQuote: true,
    lineItems,
  }
}

export function applyQuoteToInvoiceForm(
  quoteId: string,
  current: CreateInvoiceFormValues,
): Partial<CreateInvoiceFormValues> {
  const quote = getQuoteDetail(quoteId)
  const lineItems = invoiceLinesFromQuote(quote)
  const totals = computeInvoiceTotals(lineItems)
  const customerKind = quote.customerKind ?? (quote.contactId ? 'contacto' : 'empresa')
  return {
    quoteId: quote.id,
    quoteCode: quote.code,
    customerKind,
    contactId: quote.contactId ?? '',
    contactName: quote.contactName,
    companyId: quote.companyId ?? '',
    companyName: quote.companyName,
    amount: totals.amount,
    issueDate: current.issueDate || quote.issueDate,
    dueDate: current.dueDate || quote.validUntil,
    lineItems,
  }
}

export function syncInvoiceFormAmount(
  lineItems: InvoiceLineItem[],
): Pick<CreateInvoiceFormValues, 'amount'> {
  return { amount: computeInvoiceTotals(lineItems).amount }
}

export function validateCreateInvoiceForm(values: CreateInvoiceFormValues): string | null {
  if (!values.dueDate.trim()) return 'La fecha de vencimiento es obligatoria.'

  if (values.invoiceSource === 'cotizacion') {
    if (!values.quoteId.trim()) return 'Selecciona la cotización.'
  } else {
    const customerError = validateSaleCustomer(values)
    if (customerError) return customerError
  }

  const validLines = values.lineItems.filter(
    (li) => li.description.trim() && li.quantity > 0,
  )
  if (validLines.length === 0) {
    return 'Agrega al menos una línea con descripción y cantidad.'
  }

  if (!values.amount.trim() || parseAmountNum(values.amount) <= 0) {
    return 'El monto debe ser mayor a cero (revisa las líneas).'
  }

  return null
}

export function createInvoiceId(): string {
  return `invoice-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function formValuesToListItem(
  values: CreateInvoiceFormValues,
  id = createInvoiceId(),
): InvoiceListItem {
  const totals = computeInvoiceTotals(values.lineItems)
  const amountNum = totals.amountNum
  const client = saleCustomerDisplayName(values)
  return stampRecordAuditOnCreate({
    id,
    number: values.number.trim() || generateInvoiceNumber(),
    client,
    customerKind: values.customerKind,
    contactId: values.contactId.trim() || undefined,
    contactName: values.contactName.trim() || undefined,
    companyId: values.companyId.trim() || undefined,
    companyName: values.companyName.trim() || undefined,
    amount: totals.amount,
    amountNum,
    issueDate: values.issueDate.trim() || '—',
    dueDate: values.dueDate.trim(),
    owner: values.ownerName.trim(),
    status: values.status,
    paymentMethod: values.paymentMethod,
    quoteId: values.invoiceSource === 'cotizacion' ? values.quoteId.trim() || undefined : undefined,
  })
}

export function formValuesToDetailOverride(
  values: CreateInvoiceFormValues,
): InvoiceDetailOverride {
  const totals = computeInvoiceTotals(values.lineItems)
  return {
    lineItems: values.lineItems,
    subtotal: totals.subtotal,
    taxableSubtotal: totals.taxableSubtotal,
    exemptSubtotal: totals.exemptSubtotal,
    taxPercent: totals.taxPercent,
    taxAmount: totals.taxAmount,
    amount: totals.amount,
    invoiceSource: values.invoiceSource,
  }
}
