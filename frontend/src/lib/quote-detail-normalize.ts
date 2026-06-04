import type { QuoteDetail, QuoteLineItem } from '@/data/quote-detail.mock'
import { computeQuoteTotals, recalcQuoteLine } from '@/lib/quote-line-item'
import { getDefaultVatPercent, formatVatPercentLabel } from '@/lib/default-vat'
import { formatMoneyCLP, parseMoneyNum } from '@/lib/product-pricing'
import {
  legacyStatusToQuoteJourney,
  type QuoteJourneyStage,
  type QuoteStatusHistoryEntry,
} from '@/lib/quote-journey'

type QuoteApiPayload = Partial<QuoteDetail> & {
  contactName?: string
  lineItems?: QuoteLineItem[]
}

function totalsFromAmount(amount: string) {
  const totalNum = parseMoneyNum(amount)
  const taxPct = getDefaultVatPercent()
  const netNum = totalNum > 0 ? Math.round(totalNum / (1 + taxPct / 100)) : 0
  const taxAmount = totalNum - netNum
  return {
    subtotal: formatMoneyCLP(netNum),
    discountPercent: '0%',
    discountAmount: '$0',
    taxPercent: formatVatPercentLabel(taxPct),
    taxAmount: formatMoneyCLP(taxAmount),
    amount: formatMoneyCLP(totalNum),
  }
}

function statusHistoryFor(id: string, status: QuoteJourneyStage): QuoteStatusHistoryEntry[] {
  return [
    {
      id: `${id}-st-current`,
      status,
      at: 'Actual',
      note: 'Estado actual',
    },
  ]
}

/**
 * Completa campos que el detalle mock incluye pero la API aún no persiste,
 * para que vista, totales y PDF funcionen con cotizaciones reales.
 */
export function normalizeQuoteDetailFromApi(
  api: QuoteApiPayload,
  extras?: { contactEmail?: string },
): QuoteDetail {
  const id = api.id ?? ''
  const lineItems = (api.lineItems ?? []).map((li) =>
    recalcQuoteLine({
      ...li,
      priceCurrency: li.priceCurrency,
      unitPriceOriginal: li.unitPriceOriginal,
      unitPriceOriginalNum: li.unitPriceOriginalNum,
    }),
  )
  const totals =
    lineItems.length > 0
      ? computeQuoteTotals(lineItems)
      : totalsFromAmount(api.amount ?? '$0')

  const status = legacyStatusToQuoteJourney(api.status ?? 'Borrador')
  const companyName = api.companyName?.trim() || '—'
  const contactName =
    api.contactName?.trim() ||
    (api as { contact_name?: string }).contact_name?.trim() ||
    '—'
  const contactEmail = extras?.contactEmail?.trim() || ''

  const description =
    api.description?.trim() ||
    (api.title?.trim()
      ? `Propuesta comercial: ${api.title.trim()} — ${companyName}.`
      : '')

  return {
    id,
    code: api.code ?? '',
    title: api.title ?? '',
    opportunityId: api.opportunityId ?? '',
    opportunityName: api.opportunityName?.trim() || '—',
    companyName,
    companyId: api.companyId,
    contactId: api.contactId,
    customerKind: api.customerKind,
    amount: totals.amount || api.amount || '$0',
    status,
    validUntil: api.validUntil?.trim() || '—',
    issueDate: api.issueDate?.trim() || '—',
    owner: api.owner?.trim() || '—',
    createdAt: api.createdAt ?? '',
    createdById: api.createdById ?? '',
    createdByName: api.createdByName ?? '',
    updatedAt: api.updatedAt ?? '',
    updatedById: api.updatedById ?? '',
    updatedByName: api.updatedByName ?? '',
    contactName,
    contactEmail,
    version: api.version?.trim() || 'v1',
    currency: api.currency?.trim() || 'CLP',
    exchangeRateDate: api.exchangeRateDate ?? null,
    exchangeRateUf: api.exchangeRateUf ?? null,
    exchangeRateUsd: api.exchangeRateUsd ?? null,
    exchangeRateEur: api.exchangeRateEur ?? null,
    description,
    subtotal: totals.subtotal,
    discountPercent: totals.discountPercent,
    discountAmount: totals.discountAmount,
    taxPercent: totals.taxPercent,
    taxAmount: totals.taxAmount,
    paymentTerms: api.paymentTerms?.trim() ?? '',
    deliveryTerms: api.deliveryTerms?.trim() ?? '',
    billingAddress:
      api.billingAddress?.trim() ||
      (companyName !== '—' ? companyName : '—'),
    destinationWarehouseId: api.destinationWarehouseId,
    destinationWarehouse: api.destinationWarehouse?.trim() || '',
    deliveryAddress: api.deliveryAddress?.trim() || '',
    sentAt: api.sentAt,
    lineItems,
    statusHistory:
      api.statusHistory && api.statusHistory.length > 0
        ? api.statusHistory
        : statusHistoryFor(id, status),
    terms: api.terms?.trim() ?? '',
    internalNotes: api.internalNotes?.trim() || '',
    activities: api.activities ?? [],
    notes: api.notes ?? [],
  }
}
