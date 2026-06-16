import type { InvoiceListItem } from '@/data/invoices.mock'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import type { QuoteListItem } from '@/data/quotes.mock'
import { opportunitiesForCompany } from '@/lib/company-opportunities'
import { formatMoneyCLP, parseMoneyNum } from '@/lib/product-pricing'

export type CompanySalesLookup = {
  id: string
  name: string
}

export type CompanySalesSummary = {
  opportunityCount: number
  quoteCount: number
  invoiceCount: number
  invoicedPaidAmount: string
  invoicedPaidAmountNum: number
}

function norm(value: string): string {
  return value.trim().toLowerCase()
}

/** Cotizaciones vinculadas a la empresa (por id, nombre u oportunidad de la empresa). */
export function quotesForCompany(
  quotes: QuoteListItem[],
  company: CompanySalesLookup,
  opportunityIds?: ReadonlySet<string>,
): QuoteListItem[] {
  const companyId = company.id.trim()
  const companyName = norm(company.name)

  return quotes.filter((quote) => {
    if (companyId && quote.companyId === companyId) return true
    if (companyName && norm(quote.companyName) === companyName) return true
    const oppId = quote.opportunityId?.trim()
    if (oppId && opportunityIds?.has(oppId)) return true
    return false
  })
}

/** Facturas B2B vinculadas a la empresa (por id, nombre, cotización u oportunidad). */
export function invoicesForCompany(
  invoices: InvoiceListItem[],
  company: CompanySalesLookup,
  quoteIds?: ReadonlySet<string>,
): InvoiceListItem[] {
  const companyId = company.id.trim()
  const companyName = norm(company.name)

  return invoices.filter((invoice) => {
    if (invoice.customerKind === 'contacto') return false
    if (companyId && invoice.companyId === companyId) return true
    const clientName = norm(invoice.companyName || invoice.client || '')
    if (companyName && clientName === companyName) return true
    const quoteId = invoice.quoteId?.trim()
    if (quoteId && quoteIds?.has(quoteId)) return true
    return false
  })
}

/** Resumen comercial calculado desde oportunidades, cotizaciones y facturas. */
export function buildCompanySalesSummary(input: {
  company: CompanySalesLookup
  opportunities: OpportunityListItem[]
  quotes: QuoteListItem[]
  invoices: InvoiceListItem[]
}): CompanySalesSummary {
  const { company, opportunities, quotes, invoices } = input
  const relatedOpportunities = opportunitiesForCompany(opportunities, company)
  const opportunityIds = new Set(relatedOpportunities.map((opp) => opp.id))
  const relatedQuotes = quotesForCompany(quotes, company, opportunityIds)
  const quoteIds = new Set(relatedQuotes.map((quote) => quote.id))
  const relatedInvoices = invoicesForCompany(invoices, company, quoteIds)

  const invoicedPaidAmountNum = relatedInvoices
    .filter((invoice) => invoice.status === 'Pagada')
    .reduce(
      (sum, invoice) =>
        sum + (invoice.amountNum > 0 ? invoice.amountNum : parseMoneyNum(invoice.amount)),
      0,
    )

  return {
    opportunityCount: relatedOpportunities.length,
    quoteCount: relatedQuotes.length,
    invoiceCount: relatedInvoices.length,
    invoicedPaidAmount: formatMoneyCLP(invoicedPaidAmountNum),
    invoicedPaidAmountNum,
  }
}
