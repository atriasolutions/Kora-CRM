import type { InvoiceListItem } from '@/data/invoices.mock'
import { getAllKnownInvoices } from '@/data/invoices-registry-store'

export type QuoteInvoiceSummary = Pick<
  InvoiceListItem,
  'id' | 'number' | 'amount' | 'status' | 'dueDate' | 'issueDate'
>

export function invoicesForQuote(quoteId: string): InvoiceListItem[] {
  return getAllKnownInvoices().filter((inv) => inv.quoteId === quoteId)
}

export function invoiceSummariesForQuote(quoteId: string): QuoteInvoiceSummary[] {
  return invoicesForQuote(quoteId).map(
    ({ id, number, amount, status, dueDate, issueDate }) => ({
      id,
      number,
      amount,
      status,
      dueDate,
      issueDate,
    }),
  )
}
