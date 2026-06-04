import type { InvoiceDetail } from '@/data/invoice-detail.mock'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import type {
  InvoiceListItem,
  InvoicePaymentMethod,
  InvoiceStatus,
} from '@/data/invoices.mock'
import { INVOICE_PAYMENT_METHOD_OPTIONS } from '@/data/invoices.mock'
import { formatAmount, parseAmountNum } from '@/lib/invoice-display'
import { INVOICE_JOURNEY_STAGE_OPTIONS } from '@/lib/invoice-journey'
import { saleCustomerDisplayName } from '@/lib/sale-customer'
import type { SaleCustomerKind } from '@/lib/sale-customer'
import { normalizeSiiInvoiceNumber } from '@/lib/invoice-sii'

export const INVOICE_STATUS_OPTIONS = INVOICE_JOURNEY_STAGE_OPTIONS as InvoiceStatus[]

export type InvoiceFormValues = {
  number: string
  customerKind: SaleCustomerKind
  contactId: string
  contactName: string
  companyId: string
  companyName: string
  amount: string
  issueDate: string
  dueDate: string
  ownerName: string
  status: InvoiceStatus
  paymentMethod: InvoicePaymentMethod
  quoteId: string
  notes: string
  siiNumber: string
}

export { INVOICE_PAYMENT_METHOD_OPTIONS }

export function invoiceDetailToFormValues(invoice: InvoiceDetail): InvoiceFormValues {
  return {
    number: invoice.number,
    customerKind: invoice.customerKind ?? (invoice.contactId ? 'contacto' : 'empresa'),
    contactId: invoice.contactId ?? '',
    contactName: invoice.contactName ?? '',
    companyId: invoice.companyId ?? '',
    companyName: invoice.companyName ?? invoice.client,
    amount: invoice.amount,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    ownerName: invoice.owner,
    status: invoice.status,
    paymentMethod: invoice.paymentMethod,
    quoteId: invoice.quoteId ?? '',
    notes: invoice.internalNotes,
    siiNumber: invoice.siiNumber ?? '',
  }
}

export function applyFormValuesToInvoice(
  invoice: InvoiceDetail,
  values: InvoiceFormValues,
): InvoiceDetail {
  const amountNum = parseAmountNum(values.amount)
  const client = saleCustomerDisplayName({
    customerKind: values.customerKind,
    contactId: values.contactId,
    contactName: values.contactName,
    companyId: values.companyId,
    companyName: values.companyName,
  })
  return {
    ...invoice,
    number: invoice.number,
    client,
    customerKind: values.customerKind,
    contactId: values.contactId.trim() || undefined,
    contactName: values.contactName.trim() || undefined,
    companyId: values.companyId.trim() || undefined,
    companyName: values.companyName.trim() || undefined,
    amount: values.amount.trim(),
    amountNum,
    issueDate: values.issueDate.trim(),
    dueDate: values.dueDate.trim(),
    owner: values.ownerName.trim(),
    status: values.status,
    paymentMethod: values.paymentMethod,
    quoteId: values.quoteId.trim() || undefined,
    internalNotes: values.notes.trim(),
    siiNumber: values.siiNumber.trim()
      ? normalizeSiiInvoiceNumber(values.siiNumber)
      : undefined,
    balanceDue:
      values.status === 'Pagada'
        ? '$0'
        : formatAmount(amountNum - (invoice.paidAmountNum ?? 0)),
  }
}

export function listItemFromInvoiceDetail(invoice: InvoiceDetail): InvoiceListItem {
  const {
    lineItems: _li,
    payments: _p,
    activities: _a,
    notes: _n,
    description: _d,
    subtotal: _s,
    taxAmount: _t,
    taxPercent: _tp,
    balanceDue: _b,
    paidAmountNum: _pan,
    internalNotes: _in,
    quoteCode: _qc,
    statusHistory: _sh,
    files: _f,
    ...list
  } = invoice
  return stampRecordAuditOnUpdate(list)
}
