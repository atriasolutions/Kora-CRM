import type { InvoiceListItem } from '@/data/invoices.mock'

export function findInvoiceById(
  invoices: InvoiceListItem[],
  id: string,
): InvoiceListItem | undefined {
  const trimmed = id.trim()
  if (!trimmed) return undefined
  return invoices.find((i) => i.id === trimmed)
}

export function searchInvoices(
  invoices: InvoiceListItem[],
  query: string,
  limit = 12,
): InvoiceListItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return invoices.slice(0, limit)
  return invoices
    .filter(
      (i) =>
        i.number.toLowerCase().includes(q) ||
        i.client.toLowerCase().includes(q) ||
        (i.companyName?.toLowerCase().includes(q) ?? false),
    )
    .slice(0, limit)
}
