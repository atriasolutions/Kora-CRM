import { getAllKnownCompanies } from '@/data/companies-registry-store'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import type { OpportunityDetail } from '@/data/opportunity-detail.mock'
import type {
  ForecastCategory,
  OpportunityListItem,
  OpportunityPriority,
  OpportunityStage,
  OpportunityType,
} from '@/data/opportunities.mock'
import { OPPORTUNITY_STAGE_OPTIONS } from '@/data/opportunities.mock'
import { findCompanyById, resolveCanonicalCompanyId } from '@/lib/company-lookup'
import { resolveContactIdForLookup } from '@/lib/contact-lookup'
import { journeyStageToOutcome } from '@/lib/opportunity-journey'
import {
  normalizeForecastCategory,
  normalizeOpportunitySource,
  normalizeOpportunityType,
  probabilityLabelForStage,
} from '@/lib/opportunity-metadata'
import {
  resolveOpportunityCustomerKind,
  type OpportunityCustomerKind,
} from '@/lib/opportunity-customer'

export type OpportunityFormValues = {
  name: string
  customerKind: OpportunityCustomerKind
  companyId: string
  company: string
  contactId: string
  contactName: string
  contactEmail: string
  contactPhone: string
  amount: string
  probability: string
  stage: OpportunityStage
  closeDate: string
  ownerName: string
  type: OpportunityType
  priority: OpportunityPriority
  forecast: ForecastCategory
  source: string
  description: string
  decisionMaker: string
  competitors: string
  budget: string
  buyingProcess: string
  lossReason: string
}

export { OPPORTUNITY_STAGE_OPTIONS }

export {
  BUDGET_FIELD_HINT,
  BUYING_PROCESS_FIELD_HINT,
  BUYING_PROCESS_FIELD_PLACEHOLDER,
  COMPETITORS_FIELD_HINT,
  DECISION_MAKER_FIELD_HINT,
  DECISION_MAKER_FIELD_PLACEHOLDER,
  FORECAST_FIELD_HINT,
  FORECAST_FIELD_LABEL,
  FORECAST_OPTIONS,
  OPPORTUNITY_DESCRIPTION_FIELD_HINT,
  OPPORTUNITY_QUALIFICATION_SECTION_HINT,
  OPPORTUNITY_SOURCE_OPTIONS,
  OPPORTUNITY_TYPE_OPTIONS,
} from '@/lib/opportunity-metadata'

export const OPPORTUNITY_PRIORITY_OPTIONS: OpportunityPriority[] = [
  'Alta',
  'Media',
  'Baja',
]

export function opportunityDetailToFormValues(
  opp: OpportunityDetail,
): OpportunityFormValues {
  const companies = getAllKnownCompanies()
  const companyId = resolveCanonicalCompanyId(companies, {
    id: opp.companyId ?? '',
    name: opp.company,
  })
  const linkedCompany = companyId ? findCompanyById(companies, companyId) : undefined

  return {
    name: opp.name,
    customerKind: resolveOpportunityCustomerKind(opp),
    companyId,
    company: linkedCompany?.name ?? opp.company,
    contactId:
      opp.contactId?.trim() ||
      resolveContactIdForLookup({
        id: opp.contactId,
        name: opp.contactName,
        email: opp.contactEmail,
        companyId,
        company: linkedCompany?.name ?? opp.company,
      }),
    contactName: opp.contactName?.trim() && opp.contactName !== '—'
      ? opp.contactName.trim()
      : '',
    contactEmail: opp.contactEmail,
    contactPhone: opp.contactPhone,
    amount: opp.amount,
    probability: opp.probability,
    stage: opp.stage,
    closeDate: opp.closeDate,
    ownerName: opp.owner,
    type: normalizeOpportunityType(opp.type),
    priority: opp.priority,
    forecast: normalizeForecastCategory(opp.forecast),
    source: normalizeOpportunitySource(opp.source),
    description: opp.description,
    decisionMaker: opp.decisionMaker,
    competitors: opp.competitors,
    budget: opp.budget,
    buyingProcess: opp.buyingProcess,
    lossReason: opp.lossReason ?? '',
  }
}

export function computeWeightedAmount(amount: string, probability: string): string {
  const num = Number.parseInt(amount.replace(/[^\d]/g, ''), 10) || 0
  const pct = Number.parseInt(probability.replace(/[^\d]/g, ''), 10) || 0
  return `$${Math.round((num * pct) / 100).toLocaleString('es-CL')}`
}

export function applyFormValuesToOpportunity(
  opp: OpportunityDetail,
  values: OpportunityFormValues,
): OpportunityDetail {
  const probability = probabilityLabelForStage(values.stage)
  const outcome = journeyStageToOutcome(values.stage, values.lossReason)

  return {
    ...opp,
    name: values.name.trim(),
    customerKind: values.customerKind,
    companyId:
      values.customerKind === 'empresa'
        ? values.companyId.trim() || undefined
        : undefined,
    company: values.customerKind === 'empresa' ? values.company.trim() : '',
    contactId: values.contactId.trim() || undefined,
    contactName: values.contactName.trim(),
    contactEmail: values.contactEmail.trim(),
    contactPhone: values.contactPhone.trim(),
    probability,
    weightedAmount: computeWeightedAmount(opp.amount, probability),
    stage: values.stage,
    closeDate: values.closeDate.trim(),
    owner: values.ownerName.trim(),
    type: values.type,
    priority: values.priority,
    forecast: values.forecast,
    source: values.source.trim(),
    description: values.description.trim(),
    decisionMaker: values.decisionMaker.trim(),
    competitors: values.competitors.trim(),
    budget: values.budget.trim(),
    buyingProcess: values.buyingProcess.trim(),
    lossReason: values.lossReason.trim() || undefined,
    outcome,
  }
}

export function listItemFromDetail(opp: OpportunityDetail): OpportunityListItem {
  const {
    description: _d,
    createdAt: _c,
    stageEnteredAt: _s,
    contactEmail: _e,
    contactPhone: _p,
    decisionMaker: _dm,
    competitors: _co,
    lossReason: _lr,
    budget: _b,
    buyingProcess: _bp,
    nextStep: _n,
    tags: _t,
    stageHistory: _sh,
    lineItems: _li,
    activities: _a,
    notes: _no,
    quotes: _q,
    pendingActivities: _pa,
    quoteCount: _qc,
    daysInStage: _ds,
    ...list
  } = opp
  return stampRecordAuditOnUpdate(list)
}
