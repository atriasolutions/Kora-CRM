import type { ProjectDetail } from '@/data/project-detail.mock'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import type { ProjectJourneyStage } from '@/lib/project-journey'
import { journeyToListStatus } from '@/lib/project-journey'
import {
  projectCustomerFromListItem,
  projectCustomerToListPatch,
  resolveProjectClientName,
  validateProjectCustomer,
  type ProjectCustomerKind,
} from '@/lib/project-customer'
import {
  enrichProjectCommercialLinks,
  validateProjectRelations,
} from '@/lib/project-relations'
import type {
  ProjectHealth,
  ProjectListItem,
  ProjectPriority,
  ProjectStatus,
} from '@/data/projects.mock'
import {
  PROJECT_HEALTH_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
} from '@/data/projects.mock'
import { parseProgressNum } from '@/lib/project-display'
import { parsePurchaseDisplayDate } from '@/lib/purchase-dates'

function isEmptyProjectDate(value: string): boolean {
  const trimmed = value.trim()
  return !trimmed || trimmed === '—'
}

/** Entrega >= inicio cuando ambas fechas están definidas. */
export function validateProjectScheduleDates(
  values: Pick<ProjectFormValues, 'startDate' | 'deadline'>,
): string | null {
  if (isEmptyProjectDate(values.startDate) || isEmptyProjectDate(values.deadline)) {
    return null
  }
  const start = parsePurchaseDisplayDate(values.startDate)
  const deadline = parsePurchaseDisplayDate(values.deadline)
  if (!start || !deadline) return null
  if (deadline.getTime() < start.getTime()) {
    return 'La fecha de entrega debe ser igual o posterior a la fecha de inicio.'
  }
  return null
}

export type ProjectFormValues = {
  name: string
  client: string
  customerKind: ProjectCustomerKind
  companyId: string
  company: string
  contactId: string
  contactName: string
  opportunityId: string
  opportunityName: string
  acceptedQuoteId: string
  acceptedQuoteCode: string
  progress: string
  deadline: string
  managerName: string
  journeyStage: ProjectJourneyStage
  status: ProjectStatus
  priority: ProjectPriority
  health: ProjectHealth
  budget: string
  startDate: string
  description: string
}

export { PROJECT_STATUS_OPTIONS, PROJECT_PRIORITY_OPTIONS, PROJECT_HEALTH_OPTIONS }

export function defaultProjectFormValues(
  partial?: Partial<ProjectFormValues>,
): ProjectFormValues {
  return {
    name: '',
    client: '',
    customerKind: '',
    companyId: '',
    company: '',
    contactId: '',
    contactName: '',
    opportunityId: '',
    opportunityName: '',
    acceptedQuoteId: '',
    acceptedQuoteCode: '',
    progress: '0%',
    deadline: '',
    managerName: '',
    journeyStage: 'Nuevo',
    status: 'En curso',
    priority: 'Media',
    health: 'En plazo',
    budget: '',
    startDate: '',
    description: '',
    ...partial,
  }
}

export function validateProjectForm(values: ProjectFormValues): string | null {
  const customerError = validateProjectCustomer(values)
  if (customerError) return customerError
  const scheduleError = validateProjectScheduleDates(values)
  if (scheduleError) return scheduleError
  return validateProjectRelations(
    values.opportunityId.trim(),
    values.acceptedQuoteId.trim(),
  )
}

export function projectDetailToFormValues(project: ProjectDetail): ProjectFormValues {
  const customer = projectCustomerFromListItem(project)
  return {
    name: project.name,
    ...customer,
    opportunityId: project.opportunityId ?? '',
    opportunityName: project.opportunityName ?? '',
    acceptedQuoteId: project.acceptedQuoteId ?? '',
    acceptedQuoteCode: project.acceptedQuoteCode ?? '',
    progress: project.progress,
    deadline: project.deadline,
    managerName: project.manager,
    journeyStage: project.journeyStage,
    status: project.status,
    priority: project.priority,
    health: project.health,
    budget: project.budget,
    startDate: project.startDate,
    description: project.description,
  }
}

export function applyFormValuesToProject(
  project: ProjectDetail,
  values: ProjectFormValues,
): ProjectDetail {
  const progressNum = parseProgressNum(values.progress)
  const opportunityId = values.opportunityId.trim() || undefined
  const acceptedQuoteId = values.acceptedQuoteId.trim() || undefined
  const customerPatch = projectCustomerToListPatch(values)
  const next = {
    ...project,
    name: values.name.trim(),
    ...customerPatch,
    client: resolveProjectClientName(values),
    opportunityId,
    acceptedQuoteId,
    progress: values.progress.trim(),
    progressNum,
    deadline: values.deadline.trim(),
    manager: values.managerName.trim(),
    journeyStage: values.journeyStage,
    status: journeyToListStatus(values.journeyStage),
    priority: values.priority,
    health: values.health,
    budget: values.budget.trim(),
    startDate: values.startDate.trim(),
    description: values.description.trim(),
  }
  return enrichProjectCommercialLinks(next) as ProjectDetail
}

export function listItemFromProjectDetail(project: ProjectDetail): ProjectListItem {
  const {
    description: _d,
    opportunityName: _on,
    opportunityId: _oi,
    journeyHistory: _jh,
    opportunity: _opp,
    acceptedQuote: _aq,
    acceptedQuoteCode: _aqc,
    acceptedQuoteId: _aqi,
    hoursLogged: _hl,
    hoursEstimated: _he,
    tags: _t,
    team: _tm,
    activities: _a,
    notes: _n,
    ...list
  } = project
  return stampRecordAuditOnUpdate({
    ...list,
    teamMembers: project.team.map((m) => ({
      id: m.id,
      name: m.name,
      userId: m.userId,
      role: m.role,
    })),
  })
}
