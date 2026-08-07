import type {
  InvoiceListItem,
  InvoicePaymentMethod,
  InvoiceStatus,
} from '@/data/invoices.mock'
import { resolveInvoiceListStage } from '@/lib/invoice-display'
import {
  INVOICE_DOCUMENT_KIND_OPTIONS,
  type InvoiceDocumentKindFilter,
} from '@/lib/invoice-dte'
import {
  INVOICE_PAYMENT_METHOD_OPTIONS,
  INVOICE_STATUS_OPTIONS,
} from '@/data/invoices.mock'
import {
  createDefaultListDateFilter,
  isListDateFilterActive,
  listDateFilterToServerQuery,
  listRowMatchesDateFilter,
  type ListDateFilter,
} from '@/lib/list-date-filter'

export { INVOICE_DOCUMENT_KIND_OPTIONS, type InvoiceDocumentKindFilter }

export type InvoiceDueFilter = 'all' | 'month' | 'overdue'

export type InvoiceFilters = {
  statuses: InvoiceStatus[]
  paymentMethods: InvoicePaymentMethod[]
  due: InvoiceDueFilter
  documentKind: InvoiceDocumentKindFilter
  date: ListDateFilter
}

export { INVOICE_STATUS_OPTIONS, INVOICE_PAYMENT_METHOD_OPTIONS }

export const INVOICE_DUE_OPTIONS: {
  value: InvoiceDueFilter
  label: string
}[] = [
  { value: 'all', label: 'Cualquier vencimiento' },
  { value: 'month', label: 'Vence este mes' },
  { value: 'overdue', label: 'Vencidas' },
]

export function createDefaultInvoiceFilters(): InvoiceFilters {
  return {
    statuses: [],
    paymentMethods: [],
    due: 'all',
    documentKind: 'all',
    date: createDefaultListDateFilter(),
  }
}

export function countActiveInvoiceFilters(filters: InvoiceFilters): number {
  let n = 0
  if (filters.statuses.length > 0) n += 1
  if (filters.paymentMethods.length > 0) n += 1
  if (filters.due !== 'all') n += 1
  if (filters.documentKind !== 'all') n += 1
  if (isListDateFilterActive(filters.date)) n += 1
  return n
}

function matchesDue(
  dueDate: string,
  status: InvoiceStatus,
  filter: InvoiceDueFilter,
): boolean {
  switch (filter) {
    case 'month':
      return dueDate.toLowerCase().includes('may') || dueDate.toLowerCase().includes('jun')
    case 'overdue':
      return status === 'Vencida'
    default:
      return true
  }
}

export function invoiceRowMatchesFilters(
  row: InvoiceListItem,
  filters: InvoiceFilters,
): boolean {
  if (
    filters.statuses.length > 0 &&
    !filters.statuses.includes(resolveInvoiceListStage(row))
  ) {
    return false
  }
  if (
    filters.paymentMethods.length > 0 &&
    !filters.paymentMethods.includes(row.paymentMethod)
  ) {
    return false
  }
  if (!matchesDue(row.dueDate, resolveInvoiceListStage(row), filters.due)) return false
  if (
    filters.documentKind !== 'all' &&
    (row.documentKind ?? 'invoice') !== filters.documentKind
  ) {
    return false
  }
  const dateKey = row.createdAt || row.issueDate
  if (!listRowMatchesDateFilter(dateKey, filters.date)) return false
  return true
}

export function invoiceFiltersToServerQuery(
  filters: InvoiceFilters,
  options?: { mine?: boolean; ownerName?: string },
): Record<string, string> {
  const query: Record<string, string> = {
    ...listDateFilterToServerQuery(filters.date),
  }
  if (filters.statuses.length > 0) {
    query.status = filters.statuses.join(',')
  }
  if (filters.paymentMethods.length > 0) {
    query.paymentMethod = filters.paymentMethods.join(',')
  }
  if (filters.due !== 'all') {
    query.due = filters.due
  }
  if (filters.documentKind !== 'all') {
    query.documentKind = filters.documentKind
  }
  if (options?.mine && options.ownerName?.trim()) {
    query.ownerName = options.ownerName.trim()
  }
  return query
}
