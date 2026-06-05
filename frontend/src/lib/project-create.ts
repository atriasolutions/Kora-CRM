import { stampRecordAuditOnCreate } from '@/lib/record-audit'
import type { ProjectListItem } from '@/data/projects.mock'
import { journeyToListStatus } from '@/lib/project-journey'
import { findOpportunityById } from '@/lib/project-relations'
import { validateProjectRelations } from '@/lib/project-relations'
import {
  defaultProjectFormValues,
  validateProjectScheduleDates,
  type ProjectFormValues,
} from '@/lib/project-form'
import {
  inferProjectCustomerKind,
  projectCustomerToListPatch,
  resolveProjectClientName,
  validateProjectCustomer,
} from '@/lib/project-customer'

export type CreateProjectFormValues = ProjectFormValues

export function createDefaultProjectFormValues(
  partial?: Partial<CreateProjectFormValues>,
): CreateProjectFormValues {
  return defaultProjectFormValues(partial)
}

export function duplicateProjectFormValues(
  source: ProjectListItem,
): CreateProjectFormValues {
  const kind = inferProjectCustomerKind(source)
  const customer = {
    customerKind: kind,
    companyId: source.companyId ?? '',
    company: kind === 'empresa' ? source.client : '',
    contactId: source.contactId ?? '',
    contactName: source.contactName ?? (kind === 'contacto' ? source.client : ''),
    client: kind ? '' : source.client,
  } as const
  return {
    ...defaultProjectFormValues(),
    name: `${source.name.replace(/ \(copia\)$/i, '')} (copia)`,
    ...customer,
    progress: '0%',
    deadline: source.deadline,
    managerName: source.manager,
    journeyStage: source.journeyStage,
    status: journeyToListStatus(source.journeyStage),
    priority: source.priority,
    health: 'En plazo',
    budget: source.budget,
    startDate: source.startDate,
    opportunityId: source.opportunityId ?? '',
    opportunityName: '',
    acceptedQuoteId: source.acceptedQuoteId ?? '',
    acceptedQuoteCode: '',
  }
}

export function validateCreateProjectForm(values: CreateProjectFormValues): string | null {
  if (!values.name.trim()) return 'El nombre del proyecto es obligatorio.'
  const customerError = validateProjectCustomer(values)
  if (customerError) return customerError
  if (!values.deadline.trim()) return 'La fecha de entrega es obligatoria.'
  const scheduleError = validateProjectScheduleDates(values)
  if (scheduleError) return scheduleError
  return validateProjectRelations(values.opportunityId.trim(), values.acceptedQuoteId.trim())
}

export function createProjectId(): string {
  return `project-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function formValuesToListItem(
  values: CreateProjectFormValues,
  id = createProjectId(),
): ProjectListItem {
  const opportunityId = values.opportunityId.trim() || undefined
  const acceptedQuoteId = values.acceptedQuoteId.trim() || undefined
  const opp = opportunityId ? findOpportunityById(opportunityId) : undefined
  const journeyStage = values.journeyStage
  const customerPatch = projectCustomerToListPatch(values)
  return stampRecordAuditOnCreate({
    id,
    name: values.name.trim(),
    ...customerPatch,
    client: resolveProjectClientName(values),
    companyId: customerPatch.companyId ?? opp?.companyId,
    opportunityId,
    acceptedQuoteId,
    progress: '0%',
    progressNum: 0,
    deadline: values.deadline.trim(),
    manager: values.managerName.trim(),
    journeyStage,
    status: journeyToListStatus(journeyStage),
    priority: values.priority,
    health: values.health,
    budget: values.budget.trim() || '—',
    startDate: values.startDate.trim() || '—',
  })
}
