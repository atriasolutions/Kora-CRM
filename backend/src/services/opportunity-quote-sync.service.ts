import type { ComputedLine } from '../lib/line-items.js'
import { getOpportunityById, syncOpportunityFromQuoteData } from '../repositories/opportunities.repository.js'
import { getQuoteById } from '../repositories/quotes.repository.js'
import { badRequest } from '../middleware/errors.js'
import type { AuditActor } from '../types/audit.js'
import type { OpportunityDetail } from '../types/opportunity.js'
import type { QuoteDetail } from '../types/quote.js'
import { parseMoneyToCents, parsePercentToInt } from '../utils/money.js'

function quoteBelongsToOpportunity(
  quote: QuoteDetail,
  opportunityId: string,
  opportunityName: string,
): void {
  if (quote.opportunityId?.trim()) {
    if (quote.opportunityId !== opportunityId) {
      throw badRequest('La cotización no está vinculada a esta oportunidad')
    }
    return
  }
  const linkedName = quote.opportunityName?.trim()
  if (linkedName && linkedName !== opportunityName.trim()) {
    throw badRequest('La cotización no está vinculada a esta oportunidad')
  }
}

function quoteLinesToComputed(quote: QuoteDetail): ComputedLine[] {
  return quote.lineItems.map((line) => ({
    productName: line.description?.trim() || line.sku?.trim() || 'Ítem',
    description: line.description?.trim() || null,
    quantity: line.quantity,
    unitPriceCents: parseMoneyToCents(line.unitPrice),
    discountPct: parsePercentToInt(line.discount) ?? 0,
    totalCents: parseMoneyToCents(line.total),
  }))
}

export async function syncOpportunityFromQuote(
  opportunityId: string,
  quoteId: string,
  actor: AuditActor,
): Promise<OpportunityDetail> {
  const opportunity = await getOpportunityById(opportunityId)
  const quote = await getQuoteById(quoteId)
  quoteBelongsToOpportunity(quote, opportunityId, opportunity.name)

  const amountCents = parseMoneyToCents(quote.amount)
  if (amountCents <= 0) {
    throw badRequest('La cotización no tiene un monto válido para sincronizar')
  }

  const lines = quoteLinesToComputed(quote)
  const probabilityPct = parsePercentToInt(opportunity.probability)

  return syncOpportunityFromQuoteData(
    opportunityId,
    {
      quoteId,
      amountCents,
      lines,
      probabilityPct,
      closeDate: quote.validUntil?.trim() || undefined,
    },
    actor,
  )
}
