import { activityListSeed } from '@/data/activities.mock'
import { companyListSeed } from '@/data/companies.mock'
import { contactListSeed } from '@/data/contacts.mock'
import { invoiceListSeed } from '@/data/invoices.mock'
import { opportunityListSeed } from '@/data/opportunities.mock'
import { productListSeed } from '@/data/products.mock'
import { projectListSeed } from '@/data/projects.mock'
import { purchaseListSeed } from '@/data/purchases.mock'
import { quoteListSeed } from '@/data/quotes.mock'
import type { GlobalSearchResponse, GlobalSearchResult } from '@/types/global-search'

function matches(q: string, ...parts: (string | undefined)[]): boolean {
  const needle = q.toLowerCase()
  return parts.some((p) => p?.toLowerCase().includes(needle))
}

function take<T>(rows: T[], limit: number): T[] {
  return rows.slice(0, limit)
}

export function globalSearchMock(query: string, limitPerType = 5): GlobalSearchResponse {
  const q = query.trim()
  const results: GlobalSearchResult[] = []

  if (!q) return { query: '', results }

  take(
    contactListSeed.filter((row) =>
      matches(q, row.name, row.email, row.company, row.phone, row.subtitle),
    ),
    limitPerType,
  ).forEach((row) => {
    results.push({
      type: 'contact',
      id: row.id,
      title: row.name,
      subtitle: row.company || row.email || row.status,
    })
  })

  take(
    companyListSeed.filter((row) =>
      matches(q, row.name, row.rut, row.industry, row.city),
    ),
    limitPerType,
  ).forEach((row) => {
    results.push({
      type: 'company',
      id: row.id,
      title: row.name,
      subtitle: row.industry || row.city || row.lifecycle,
    })
  })

  take(
    opportunityListSeed.filter((row) =>
      matches(q, row.name, row.company, row.contactName, row.stage),
    ),
    limitPerType,
  ).forEach((row) => {
    results.push({
      type: 'opportunity',
      id: row.id,
      title: row.name,
      subtitle: row.company || row.stage,
    })
  })

  take(
    quoteListSeed.filter((row) =>
      matches(q, row.code, row.title, row.companyName, row.opportunityName),
    ),
    limitPerType,
  ).forEach((row) => {
    results.push({
      type: 'quote',
      id: row.id,
      title: `${row.code} — ${row.title}`,
      subtitle: row.companyName || row.status,
    })
  })

  take(
    invoiceListSeed.filter((row) =>
      matches(q, row.number, row.client, row.companyName, row.contactName),
    ),
    limitPerType,
  ).forEach((row) => {
    results.push({
      type: 'invoice',
      id: row.id,
      title: row.number,
      subtitle: row.client || row.status,
    })
  })

  take(
    activityListSeed.filter((row) =>
      matches(q, row.title, row.companyName, row.relatedName, row.typeLabel),
    ),
    limitPerType,
  ).forEach((row) => {
    results.push({
      type: 'activity',
      id: row.id,
      title: row.title,
      subtitle: row.companyName || row.typeLabel,
    })
  })

  take(
    projectListSeed.filter((row) =>
      matches(q, row.name, row.client, row.manager),
    ),
    limitPerType,
  ).forEach((row) => {
    results.push({
      type: 'project',
      id: row.id,
      title: row.name,
      subtitle: row.client || row.status,
    })
  })

  take(
    productListSeed.filter((row) =>
      matches(q, row.name, row.sku, row.category, row.productType),
    ),
    limitPerType,
  ).forEach((row) => {
    results.push({
      type: 'product',
      id: row.id,
      title: row.name,
      subtitle: row.sku || row.category || row.status,
    })
  })

  take(
    purchaseListSeed.filter((row) =>
      matches(q, row.reference, row.supplier, row.productSummary),
    ),
    limitPerType,
  ).forEach((row) => {
    results.push({
      type: 'purchase',
      id: row.id,
      title: row.reference,
      subtitle: row.supplier || row.status,
    })
  })

  return { query: q, results }
}
