import type {
  OpportunityDetail,
  OpportunityLineItemDto,
  OpportunityListItem,
} from '../types/opportunity.js'
import {
  formatCentsToMoney,
  formatDiscountPct,
  formatPercent,
  parseMoneyToCents,
  weightedCents,
} from '../utils/money.js'
import { probabilityPercentForStage } from '../lib/opportunity-stage.js'
import { formatActivityLabel, formatDateLabel, toIsoString } from '../utils/format.js'

export type OpportunityRow = {
  id: string
  name: string
  customer_kind: 'empresa' | 'contacto' | null
  company_id: string | null
  company_name: string
  contact_id: string | null
  contact_name: string
  amount_cents: string | number
  weighted_amount_cents: string | number
  stage: string
  probability_pct: number | null
  close_date: Date | string | null
  owner_name: string | null
  opp_type: string | null
  priority: string | null
  outcome: OpportunityListItem['outcome']
  forecast: string | null
  source: string | null
  contact_email: string | null
  contact_phone: string | null
  description: string | null
  decision_maker: string | null
  competitors: string | null
  budget_label: string | null
  buying_process: string | null
  loss_reason: string | null
  primary_quote_id: string | null
  last_activity_at: Date | null
  created_at: Date
  created_by_id: string | null
  created_by_name: string | null
  updated_at: Date
  updated_by_id: string | null
  updated_by_name: string | null
}

export type OpportunityLineRow = {
  id: string
  opportunity_id: string
  description: string | null
  product_name: string | null
  quantity: string | number
  unit_price_cents: string | number
  discount_pct: string | number | null
  total_cents: string | number
  sort_order: number
}

export function mapOpportunityLineRow(row: OpportunityLineRow): OpportunityLineItemDto {
  return {
    id: row.id,
    product: row.product_name ?? row.description ?? '',
    quantity: Number(row.quantity),
    unitPrice: formatCentsToMoney(row.unit_price_cents),
    discount: formatDiscountPct(row.discount_pct),
    total: formatCentsToMoney(row.total_cents),
  }
}

function mapOpportunityDetailFields(row: OpportunityRow) {
  return {
    contactEmail: row.contact_email?.trim() ?? '',
    contactPhone: row.contact_phone?.trim() ?? '',
    description: row.description?.trim() ?? '',
    decisionMaker: row.decision_maker?.trim() ?? '',
    competitors: row.competitors?.trim() ?? '',
    budget: row.budget_label?.trim() ?? '',
    buyingProcess: row.buying_process?.trim() ?? '',
    lossReason: row.loss_reason?.trim() || undefined,
    primaryQuoteId: row.primary_quote_id ?? undefined,
  }
}

export function mapOpportunityRow(row: OpportunityRow): OpportunityListItem {
  const probabilityPct = probabilityPercentForStage(row.stage)
  const amountCents = parseMoneyToCents(row.amount_cents)
  const weightedAmountCents = weightedCents(amountCents, probabilityPct)

  return {
    id: row.id,
    name: row.name,
    customerKind: row.customer_kind ?? undefined,
    company: row.company_name,
    companyId: row.company_id ?? undefined,
    contactId: row.contact_id ?? undefined,
    contactName: row.contact_name,
    amount: formatCentsToMoney(row.amount_cents),
    weightedAmount: formatCentsToMoney(weightedAmountCents),
    stage: row.stage,
    probability: formatPercent(probabilityPct),
    closeDate: formatDateLabel(row.close_date),
    owner: row.owner_name ?? '',
    type: row.opp_type ?? '',
    priority: row.priority ?? '',
    outcome: row.outcome,
    forecast: row.forecast ?? '',
    source: row.source ?? '',
    lastActivity: formatActivityLabel(row.last_activity_at),
    createdAt: toIsoString(row.created_at),
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name ?? '',
    updatedAt: toIsoString(row.updated_at),
    updatedById: row.updated_by_id ?? '',
    updatedByName: row.updated_by_name ?? '',
  }
}

export function mapOpportunityDetail(
  row: OpportunityRow,
  lineItems: OpportunityLineRow[],
): OpportunityDetail {
  return {
    ...mapOpportunityRow(row),
    ...mapOpportunityDetailFields(row),
    lineItems: lineItems.map(mapOpportunityLineRow),
  }
}
