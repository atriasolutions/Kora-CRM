import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type { SolicitudDetail, SolicitudListItem } from '@/data/solicitudes.mock'
import type { CreateSolicitudFormValues } from '@/lib/solicitud-create'
import { serializeDescriptionHtml } from '@/lib/solicitud-description-media'
import { teamToApiInput } from '@/lib/solicitud-team-access'
import type { SolicitudFormValues } from '@/lib/solicitud-form'

const BASE = `${API_V1}/solicitudes`

export type SolicitudApiBody = {
  title?: string
  description?: string
  status?: string
  priority?: string
  assigneeName?: string
  assigneeUserId?: string | null
  requesterUserId?: string | null
  team?: { userId?: string; userName?: string; roleLabel?: string }[]
}

export function solicitudFormToApiBody(values: CreateSolicitudFormValues): SolicitudApiBody {
  return {
    title: values.title.trim(),
    description: serializeDescriptionHtml(values.description) || undefined,
    status: values.status,
    priority: values.priority,
    assigneeName: values.assigneeName.trim() || undefined,
    assigneeUserId: values.assigneeUserId?.trim() || null,
    requesterUserId: values.requesterUserId?.trim() || null,
  }
}

export function solicitudDetailToApiBody(detail: SolicitudDetail): SolicitudApiBody {
  return {
    title: detail.title,
    description: serializeDescriptionHtml(detail.description ?? '') || undefined,
    status: detail.status,
    priority: detail.priority,
    assigneeName: detail.assignee || undefined,
    assigneeUserId: detail.assigneeUserId ?? null,
    team: teamToApiInput(detail.team, detail.assignee),
  }
}

export function solicitudFormValuesToApiBody(values: SolicitudFormValues): SolicitudApiBody {
  return {
    title: values.title.trim(),
    description: serializeDescriptionHtml(values.description) || undefined,
    status: values.status,
    priority: values.priority,
    assigneeName: values.assigneeName.trim() || undefined,
    assigneeUserId: values.assigneeUserId?.trim() || null,
  }
}

export function solicitudPatchToApiBody(patch: Partial<SolicitudListItem>): SolicitudApiBody {
  const body: SolicitudApiBody = {}
  if (patch.title !== undefined) body.title = patch.title
  if (patch.description !== undefined) body.description = patch.description
  if (patch.status !== undefined) body.status = patch.status
  if (patch.priority !== undefined) body.priority = patch.priority
  if (patch.assignee !== undefined) body.assigneeName = patch.assignee
  if (patch.assigneeUserId !== undefined) body.assigneeUserId = patch.assigneeUserId ?? null
  return body
}

export async function listSolicitudesApi(archived: boolean): Promise<SolicitudListItem[]> {
  return fetchAllPages<SolicitudListItem>(BASE, {
    archived: archived ? 'true' : 'false',
  })
}

export async function getSolicitudApi(id: string): Promise<SolicitudDetail> {
  const res = await fetchJSON<ApiItemResponse<SolicitudDetail>>(`${BASE}/${id}`)
  return res.data
}

export async function createSolicitudApi(body: SolicitudApiBody): Promise<SolicitudDetail> {
  const res = await fetchJSON<ApiItemResponse<SolicitudDetail>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateSolicitudApi(
  id: string,
  body: Partial<SolicitudApiBody>,
): Promise<SolicitudDetail> {
  const res = await fetchJSON<ApiItemResponse<SolicitudDetail>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function archiveSolicitudApi(id: string): Promise<SolicitudListItem> {
  const res = await fetchJSON<ApiItemResponse<SolicitudListItem>>(
    `${BASE}/${id}/archive`,
    { method: 'POST' },
  )
  return res.data
}

export async function restoreSolicitudApi(id: string): Promise<SolicitudListItem> {
  const res = await fetchJSON<ApiItemResponse<SolicitudListItem>>(
    `${BASE}/${id}/restore`,
    { method: 'POST' },
  )
  return res.data
}

export async function permanentlyDeleteSolicitudApi(id: string): Promise<void> {
  await fetchJSON<void>(`${BASE}/${id}`, { method: 'DELETE' })
}
