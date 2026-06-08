import { stampRecordAuditOnCreate } from '@/lib/record-audit'
import type { ProjectListItem } from '@/data/projects.mock'
import { journeyToListStatus } from '@/lib/project-journey'
import { inferCommercialOrigin, validateCommercialOrigin } from '@/lib/project-commercial-origin'
import { validateProjectRelations } from '@/lib/project-relations'
import type { QuoteListItem } from '@/data/quotes.mock'
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
    solicitudId: source.solicitudId ?? '',
    solicitudTitle: source.solicitudTitle ?? '',
    solicitudCode: source.solicitudCode ?? '',
    commercialOrigin: inferCommercialOrigin({
      commercialOrigin: 'none',
      solicitudId: source.solicitudId ?? '',
      opportunityId: source.opportunityId ?? '',
    }),
  }
}

export function validateCreateProjectForm(
  values: CreateProjectFormValues,
  allQuotes: QuoteListItem[] = [],
): string | null {
  if (!values.name.trim()) return 'El nombre del proyecto es obligatorio.'
  const customerError = validateProjectCustomer(values)
  if (customerError) return customerError
  if (!values.deadline.trim()) return 'La fecha de entrega es obligatoria.'
  const scheduleError = validateProjectScheduleDates(values)
  if (scheduleError) return scheduleError
  const originError = validateCommercialOrigin(values)
  if (originError) return originError
  return validateProjectRelations(
    values.opportunityId.trim(),
    values.acceptedQuoteId.trim(),
    allQuotes,
  )
}

export function createProjectId(): string {
  return `project-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function formValuesToListItem(
  values: CreateProjectFormValues,
  id = createProjectId(),
): ProjectListItem {
  const origin = inferCommercialOrigin(values)
  const opportunityId =
    origin === 'oportunidad' ? values.opportunityId.trim() || undefined : undefined
  const acceptedQuoteId =
    origin === 'oportunidad' ? values.acceptedQuoteId.trim() || undefined : undefined
  const solicitudId = origin === 'solicitud' ? values.solicitudId.trim() || undefined : undefined
  const journeyStage = values.journeyStage
  const customerPatch = projectCustomerToListPatch(values)
  return stampRecordAuditOnCreate({
    id,
    name: values.name.trim(),
    ...customerPatch,
    client: resolveProjectClientName(values),
    companyId: customerPatch.companyId,
    opportunityId,
    acceptedQuoteId,
    solicitudId,
    solicitudTitle: origin === 'solicitud' ? values.solicitudTitle.trim() || undefined : undefined,
    solicitudCode: origin === 'solicitud' ? values.solicitudCode.trim() || undefined : undefined,
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
