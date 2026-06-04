import { stampRecordAuditOnCreate } from '@/lib/record-audit'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import {
  defaultOpportunityCustomerValues,
  resolveOpportunityCustomerKind,
  validateOpportunityCustomer,
} from '@/lib/opportunity-customer'
import {
  computeWeightedAmount,
  type OpportunityFormValues,
} from '@/lib/opportunity-form'
import {
  defaultEstimatedCloseDate,
  normalizeForecastCategory,
  normalizeOpportunitySource,
  normalizeOpportunityType,
  OPPORTUNITY_AMOUNT_PENDING,
  probabilityLabelForStage,
} from '@/lib/opportunity-metadata'

export type CreateOpportunityFormValues = OpportunityFormValues

export function createDefaultOpportunityFormValues(
  partial?: Partial<OpportunityFormValues>,
): OpportunityFormValues {
  const stage = partial?.stage ?? 'Calificados'
  const customer = defaultOpportunityCustomerValues(partial)
  return {
    name: '',
    ...customer,
    contactEmail: partial?.contactEmail ?? '',
    contactPhone: partial?.contactPhone ?? '',
    amount: partial?.amount ?? OPPORTUNITY_AMOUNT_PENDING,
    probability: probabilityLabelForStage(stage),
    stage,
    closeDate: partial?.closeDate ?? defaultEstimatedCloseDate(),
    ownerName: partial?.ownerName ?? getDefaultOwnerName(),
    type: partial?.type ?? 'Nuevo negocio',
    priority: partial?.priority ?? 'Media',
    forecast: partial?.forecast ?? 'En pipeline',
    source: partial?.source ?? 'Formulario web',
    description: partial?.description ?? '',
    decisionMaker: partial?.decisionMaker ?? '',
    competitors: partial?.competitors ?? '',
    budget: partial?.budget ?? '',
    buyingProcess: partial?.buyingProcess ?? '',
    lossReason: partial?.lossReason ?? '',
    ...partial,
    ...customer,
  }
}

export function duplicateOpportunityFormValues(
  source: OpportunityListItem,
): CreateOpportunityFormValues {
  return createDefaultOpportunityFormValues({
    name: `${source.name.replace(/ \(copia\)$/i, '')} (copia)`,
    customerKind: resolveOpportunityCustomerKind(source),
    companyId: source.companyId ?? '',
    company: source.company,
    contactId: source.contactId ?? '',
    contactName: source.contactName,
    stage: source.stage === 'Cerrada' ? 'Calificados' : source.stage,
    closeDate: source.closeDate,
    ownerName: source.owner,
    type: normalizeOpportunityType(source.type),
    priority: source.priority,
    forecast: normalizeForecastCategory(source.forecast),
    source: normalizeOpportunitySource(source.source),
    amount: source.amount,
  })
}

export function validateCreateOpportunityForm(
  values: OpportunityFormValues,
): string | null {
  if (!values.name.trim()) return 'El nombre de la oportunidad es obligatorio.'
  const customerError = validateOpportunityCustomer(values)
  if (customerError) return customerError
  if (!values.closeDate.trim()) return 'La fecha de cierre estimada es obligatoria.'
  return null
}

export function createOpportunityId(): string {
  return `opportunity-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function formValuesToListItem(
  values: OpportunityFormValues,
  id = createOpportunityId(),
): OpportunityListItem {
  const amount = values.amount.trim() || OPPORTUNITY_AMOUNT_PENDING
  const probability = probabilityLabelForStage(values.stage)
  return stampRecordAuditOnCreate({
    id,
    name: values.name.trim(),
    customerKind: values.customerKind,
    companyId:
      values.customerKind === 'empresa'
        ? values.companyId.trim() || undefined
        : undefined,
    company: values.customerKind === 'empresa' ? values.company.trim() : '',
    contactId: values.contactId.trim() || undefined,
    contactName: values.contactName.trim() || '—',
    amount,
    weightedAmount: computeWeightedAmount(amount, probability),
    stage: values.stage,
    probability,
    closeDate: values.closeDate.trim(),
    owner: values.ownerName.trim(),
    type: normalizeOpportunityType(values.type),
    priority: values.priority,
    outcome: 'Abierta',
    forecast: normalizeForecastCategory(values.forecast),
    source: normalizeOpportunitySource(values.source),
    lastActivity: 'Recién creada',
  })
}
