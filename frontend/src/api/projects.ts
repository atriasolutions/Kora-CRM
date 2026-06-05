import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type { ProjectDetail } from '@/data/project-detail.mock'
import type { ProjectListItem } from '@/data/projects.mock'
import type { CreateProjectFormValues } from '@/lib/project-create'
import { parseProgressNum } from '@/lib/project-display'
import { projectCustomerApiFields } from '@/lib/project-customer'
import { teamToApiInput } from '@/lib/project-team-access'
import type { ProjectFormValues } from '@/lib/project-form'
import type { ProjectWorkPlan } from '@/types/project-work-plan'

const BASE = `${API_V1}/projects`

export type ProjectApiBody = {
  name?: string
  client?: string
  customerKind?: string
  contactId?: string
  companyId?: string
  opportunityId?: string
  acceptedQuoteId?: string
  progress?: string
  progressPct?: number
  deadline?: string
  managerName?: string
  journeyStage?: string
  status?: string
  priority?: string
  health?: string
  budget?: string
  startDate?: string
  team?: { userId?: string; userName?: string; roleLabel?: string }[]
}

export function projectFormToApiBody(values: CreateProjectFormValues): ProjectApiBody {
  const customer = projectCustomerApiFields(values)
  return {
    name: values.name.trim(),
    ...customer,
    opportunityId: values.opportunityId.trim() || undefined,
    acceptedQuoteId: values.acceptedQuoteId.trim() || undefined,
    progress: values.progress.trim() || undefined,
    progressPct: parseProgressNum(values.progress),
    deadline: values.deadline.trim(),
    managerName: values.managerName.trim() || undefined,
    journeyStage: values.journeyStage,
    status: values.status,
    priority: values.priority,
    health: values.health,
    budget: values.budget.trim() || undefined,
    startDate: values.startDate.trim() || undefined,
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function optionalUuid(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed || !UUID_RE.test(trimmed)) return undefined
  return trimmed
}

export function projectDetailToApiBody(detail: ProjectDetail): ProjectApiBody {
  const progressPct =
    detail.progressNum != null && Number.isFinite(detail.progressNum)
      ? Math.round(detail.progressNum)
      : undefined

  return {
    name: detail.name,
    client: detail.client || undefined,
    customerKind: detail.customerKind,
    contactId: optionalUuid(detail.contactId),
    companyId: optionalUuid(detail.companyId),
    opportunityId: optionalUuid(detail.opportunityId),
    acceptedQuoteId: optionalUuid(detail.acceptedQuoteId),
    progress: detail.progress || undefined,
    progressPct,
    deadline: detail.deadline || undefined,
    managerName: detail.manager || undefined,
    journeyStage: detail.journeyStage,
    status: detail.status,
    priority: detail.priority,
    health: detail.health,
    budget: detail.budget && detail.budget !== '—' ? detail.budget : undefined,
    startDate: detail.startDate && detail.startDate !== '—' ? detail.startDate : undefined,
    team: teamToApiInput(detail.team, detail.manager),
  }
}

export function projectFormValuesToApiBody(values: ProjectFormValues): ProjectApiBody {
  const customer = projectCustomerApiFields(values)
  return {
    name: values.name.trim(),
    ...customer,
    opportunityId: values.opportunityId.trim() || undefined,
    acceptedQuoteId: values.acceptedQuoteId.trim() || undefined,
    progress: values.progress.trim(),
    progressPct: parseProgressNum(values.progress),
    deadline: values.deadline.trim(),
    managerName: values.managerName.trim() || undefined,
    journeyStage: values.journeyStage,
    status: values.status,
    priority: values.priority,
    health: values.health,
    budget: values.budget.trim() || undefined,
    startDate: values.startDate.trim() || undefined,
  }
}

export function projectPatchToApiBody(patch: Partial<ProjectListItem>): ProjectApiBody {
  const body: ProjectApiBody = {}
  if (patch.name !== undefined) body.name = patch.name
  if (patch.client !== undefined) body.client = patch.client
  if (patch.companyId !== undefined) body.companyId = patch.companyId
  if (patch.customerKind !== undefined) body.customerKind = patch.customerKind
  if (patch.contactId !== undefined) body.contactId = patch.contactId
  if (patch.opportunityId !== undefined) body.opportunityId = patch.opportunityId
  if (patch.acceptedQuoteId !== undefined) body.acceptedQuoteId = patch.acceptedQuoteId
  if (patch.progress !== undefined) {
    body.progress = patch.progress
    body.progressPct = patch.progressNum ?? parseProgressNum(patch.progress)
  }
  if (patch.deadline !== undefined) body.deadline = patch.deadline
  if (patch.manager !== undefined) body.managerName = patch.manager
  if (patch.journeyStage !== undefined) body.journeyStage = patch.journeyStage
  if (patch.status !== undefined) body.status = patch.status
  if (patch.priority !== undefined) body.priority = patch.priority
  if (patch.health !== undefined) body.health = patch.health
  if (patch.budget !== undefined) body.budget = patch.budget
  if (patch.startDate !== undefined) body.startDate = patch.startDate
  return body
}

export async function listProjectsApi(archived: boolean): Promise<ProjectListItem[]> {
  return fetchAllPages<ProjectListItem>(BASE, {
    archived: archived ? 'true' : 'false',
  })
}

export async function getProjectApi(id: string): Promise<ProjectDetail> {
  const res = await fetchJSON<ApiItemResponse<ProjectDetail>>(`${BASE}/${id}`)
  return res.data
}

export async function createProjectApi(body: ProjectApiBody): Promise<ProjectDetail> {
  const res = await fetchJSON<ApiItemResponse<ProjectDetail>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateProjectApi(
  id: string,
  body: Partial<ProjectApiBody>,
): Promise<ProjectDetail> {
  const res = await fetchJSON<ApiItemResponse<ProjectDetail>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function archiveProjectApi(id: string): Promise<ProjectListItem> {
  const res = await fetchJSON<ApiItemResponse<ProjectListItem>>(
    `${BASE}/${id}/archive`,
    { method: 'POST' },
  )
  return res.data
}

export async function restoreProjectApi(id: string): Promise<ProjectListItem> {
  const res = await fetchJSON<ApiItemResponse<ProjectListItem>>(
    `${BASE}/${id}/restore`,
    { method: 'POST' },
  )
  return res.data
}

export async function permanentlyDeleteProjectApi(id: string): Promise<void> {
  await fetchJSON<void>(`${BASE}/${id}`, { method: 'DELETE' })
}

export async function getProjectWorkPlanApi(
  projectId: string,
): Promise<ProjectWorkPlan> {
  const res = await fetchJSON<ApiItemResponse<ProjectWorkPlan>>(
    `${BASE}/${projectId}/work-plan`,
  )
  return res.data
}

export async function saveProjectWorkPlanApi(
  projectId: string,
  plan: ProjectWorkPlan,
): Promise<ProjectWorkPlan> {
  const res = await fetchJSON<ApiItemResponse<ProjectWorkPlan>>(
    `${BASE}/${projectId}/work-plan`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    },
  )
  return res.data
}
