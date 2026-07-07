import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type { OpportunityDetail } from '@/data/opportunity-detail.mock'
import type { OpportunityLineItem } from '@/data/opportunity-detail.mock'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import type { OpportunityStage } from '@/data/opportunities.mock'
import type { OpportunityFormValues } from '@/lib/opportunity-form'
import { probabilityLabelForStage } from '@/lib/opportunity-metadata'
import { purchaseDisplayDateToInput } from '@/lib/purchase-dates'

const BASE = `${API_V1}/opportunities`

function opportunityCloseDateForApi(closeDate: string | undefined): string | undefined {
  const iso = purchaseDisplayDateToInput(closeDate?.trim() ?? '')
  return iso || closeDate?.trim() || undefined
}

function opportunityQualificationForApi(values: {
  contactEmail?: string
  contactPhone?: string
  description?: string
  decisionMaker?: string
  competitors?: string
  budget?: string
  buyingProcess?: string
  lossReason?: string
}) {
  return {
    contactEmail: values.contactEmail?.trim() || undefined,
    contactPhone: values.contactPhone?.trim() || undefined,
    description: values.description?.trim() || undefined,
    decisionMaker: values.decisionMaker?.trim() || undefined,
    competitors: values.competitors?.trim() || undefined,
    budget: values.budget?.trim() || undefined,
    buyingProcess: values.buyingProcess?.trim() || undefined,
    lossReason: values.lossReason?.trim() || undefined,
  }
}

export type OpportunityApiBody = {
  name: string
  customerKind?: string
  companyId?: string | null
  company?: string
  contactId?: string | null
  contactName?: string
  amount?: string
  stage?: string
  probability?: string
  closeDate?: string
  owner?: string
  type?: string
  priority?: string
  outcome?: string
  forecast?: string
  source?: string
  contactEmail?: string
  contactPhone?: string
  description?: string
  decisionMaker?: string
  competitors?: string
  budget?: string
  buyingProcess?: string
  lossReason?: string
  lineItems?: {
    product?: string
    description?: string
    quantity?: number
    unitPrice?: string
    discount?: string
  }[]
}

export function opportunityFormToApiBody(
  values: OpportunityFormValues,
): OpportunityApiBody {
  return {
    name: values.name.trim(),
    customerKind: values.customerKind,
    companyId:
      values.customerKind === 'empresa'
        ? values.companyId?.trim() || null
        : null,
    company: values.customerKind === 'empresa' ? values.company?.trim() : '',
    contactId: values.contactId?.trim() || null,
    contactName: values.contactName?.trim() || undefined,
    amount: values.amount?.trim() || undefined,
    stage: values.stage,
    probability: probabilityLabelForStage(values.stage),
    closeDate: opportunityCloseDateForApi(values.closeDate),
    owner: values.ownerName?.trim() || undefined,
    type: values.type,
    priority: values.priority,
    forecast: values.forecast,
    source: values.source?.trim() || undefined,
    ...opportunityQualificationForApi(values),
  }
}

export function opportunityDetailToApiBody(
  detail: OpportunityDetail,
): OpportunityApiBody {
  return {
    name: detail.name,
    customerKind: detail.customerKind,
    companyId: detail.companyId ?? null,
    company: detail.company,
    contactId: detail.contactId ?? null,
    contactName: detail.contactName,
    amount: detail.amount,
    stage: detail.stage,
    probability: probabilityLabelForStage(detail.stage as OpportunityStage),
    closeDate: detail.closeDate,
    owner: detail.owner,
    type: detail.type,
    priority: detail.priority,
    outcome: detail.outcome,
    forecast: detail.forecast,
    source: detail.source,
    closeDate: opportunityCloseDateForApi(detail.closeDate),
    ...opportunityQualificationForApi(detail),
  }
}

export async function listOpportunitiesApi(
  archived: boolean,
): Promise<OpportunityListItem[]> {
  return fetchAllPages<OpportunityListItem>(BASE, {
    archived: archived ? 'true' : 'false',
  })
}

/** Oportunidades vinculadas a una empresa (ficha empresa, cotizaciones filtradas). */
export async function listOpportunitiesForCompanyApi(
  companyId: string,
): Promise<OpportunityListItem[]> {
  const id = companyId.trim()
  if (!id) return []
  return fetchAllPages<OpportunityListItem>(BASE, {
    companyId: id,
    archived: 'false',
  })
}

export async function getOpportunityApi(id: string): Promise<OpportunityDetail> {
  const res = await fetchJSON<
    ApiItemResponse<OpportunityListItem & { lineItems: OpportunityLineItem[] }>
  >(`${BASE}/${id}`)
  return res.data as OpportunityDetail
}

export async function createOpportunityApi(
  body: OpportunityApiBody,
): Promise<OpportunityListItem> {
  const res = await fetchJSON<ApiItemResponse<OpportunityListItem>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateOpportunityApi(
  id: string,
  body: Partial<OpportunityApiBody>,
): Promise<OpportunityDetail> {
  const res = await fetchJSON<
    ApiItemResponse<OpportunityListItem & { lineItems: OpportunityLineItem[] }>
  >(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data as OpportunityDetail
}

export async function archiveOpportunityApi(
  id: string,
): Promise<OpportunityListItem> {
  const res = await fetchJSON<ApiItemResponse<OpportunityListItem>>(
    `${BASE}/${id}/archive`,
    { method: 'POST' },
  )
  return res.data
}

export async function restoreOpportunityApi(
  id: string,
): Promise<OpportunityListItem> {
  const res = await fetchJSON<ApiItemResponse<OpportunityListItem>>(
    `${BASE}/${id}/restore`,
    { method: 'POST' },
  )
  return res.data
}

export async function deleteOpportunityApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}
