import type { InvoiceListItem } from '@/data/invoices.mock'
import type { EntityRecentSlug } from '@/lib/entity-recently-viewed'
import { loadRecentlyViewedIds } from '@/lib/entity-recently-viewed'
import {
  createListScopeOptions,
  matchesListScope,
  sortByRecentlyViewed,
  type ListScope,
} from '@/lib/list-scope'

export const INVOICE_RECENT_SLUG: EntityRecentSlug = 'facturacion'

export type InvoiceListScope = ListScope

export const INVOICE_LIST_SCOPE_OPTIONS = createListScopeOptions({
  mineLabel: 'Mis facturas',
  allLabel: 'Todas las facturas',
})

export const INVOICE_SCOPE_SHORT_LABELS: Record<InvoiceListScope, string> = {
  mine: 'Mis Facturas',
  all: 'Todos',
  recent: 'Recientes',
}

export function invoiceMatchesListScope(
  row: InvoiceListItem,
  scope: InvoiceListScope,
  recentIds: string[],
): boolean {
  return matchesListScope(row, scope, (r) => r.owner, recentIds)
}

export function sortInvoicesByRecentlyViewed(
  rows: InvoiceListItem[],
  recentIds: string[],
): InvoiceListItem[] {
  return sortByRecentlyViewed(rows, recentIds)
}

export function loadInvoiceRecentIds(): string[] {
  return loadRecentlyViewedIds(INVOICE_RECENT_SLUG)
}
