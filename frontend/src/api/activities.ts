import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type { ActivityDetail } from '@/data/activity-detail.mock'
import type { ActivityListItem } from '@/data/activities.mock'
import {
  chileDatetimeLocalToIso,
  parseChileDatetimeInput,
} from '@/lib/chile-timezone'
import type { CreateActivityFormValues } from '@/lib/activity-create'
import { parseDurationMinutes } from '@/lib/activity-create'
import {
  formatReminderLabel,
  reminderAtIsoFromForm,
} from '@/lib/activity-reminder'
import type { ActivityFormValues } from '@/lib/activity-form'
import { applyFormValuesToActivity } from '@/lib/activity-form'

const BASE = `${API_V1}/activities`

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string | undefined): boolean {
  return Boolean(value?.trim() && UUID_RE.test(value.trim()))
}

function scheduledAtForApi(detail: ActivityDetail): string | undefined {
  const raw = detail.scheduledAt?.trim()
  if (!raw) return undefined
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
    return chileDatetimeLocalToIso(raw) ?? raw
  }
  const parsed = parseChileDatetimeInput(raw)
  if (parsed) return parsed.toISOString()
  return undefined
}

function reminderAtForApi(value: string | undefined): string | undefined {
  const raw = value?.trim()
  if (!raw) return undefined
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw
  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  return undefined
}

export type ActivityApiBody = {
  title?: string
  type?: string
  relatedType?: string
  relatedId?: string
  relatedName?: string
  companyName?: string
  scheduledAt?: string
  assigneeName?: string
  status?: string
  priority?: string
  reminderAt?: string
  reminder?: string
  durationMinutes?: number
}

export function activityFormToApiBody(values: CreateActivityFormValues): ActivityApiBody {
  const durationMinutes = parseDurationMinutes(values.durationMinutes)
  return {
    title: values.title.trim(),
    type: values.type,
    relatedType: values.relatedType,
    relatedId: values.relatedId!.trim(),
    relatedName: values.relatedName.trim() || undefined,
    companyName: values.companyName?.trim() || undefined,
    scheduledAt: chileDatetimeLocalToIso(values.scheduledAt) ?? values.scheduledAt,
    assigneeName: values.assigneeName.trim() || undefined,
    status: values.status,
    priority: values.priority,
    reminderAt: reminderAtIsoFromForm(values.scheduledAt, values) ?? undefined,
    reminder: formatReminderLabel(values.reminderPreset, values.reminderCustomAt),
    ...(durationMinutes != null ? { durationMinutes } : {}),
  }
}

/** Solo cambio de estado (ruta del éxito, completar). Evita revalidar vínculos y fechas. */
export function activityStatusPatchBody(status: string): ActivityApiBody {
  return { status }
}

export function activityDetailToApiBody(detail: ActivityDetail): ActivityApiBody {
  const body: ActivityApiBody = {
    title: detail.title.trim(),
    type: detail.type,
    status: detail.status,
    priority: detail.priority,
    assigneeName: detail.assignee?.trim() || undefined,
    relatedName: detail.relatedName?.trim() || undefined,
    companyName: detail.companyName?.trim() || undefined,
    reminder: detail.reminder?.trim() || undefined,
  }
  if (detail.durationMinutes != null && detail.durationMinutes > 0) {
    body.durationMinutes = detail.durationMinutes
  }
  const scheduled = scheduledAtForApi(detail)
  if (scheduled) body.scheduledAt = scheduled
  const reminderAt = reminderAtForApi(detail.reminderAt)
  if (reminderAt) body.reminderAt = reminderAt
  if (isUuid(detail.relatedId)) {
    body.relatedType = detail.relatedType
    body.relatedId = detail.relatedId.trim()
  }
  return body
}

export function activityFormValuesToApiBody(
  activity: ActivityDetail,
  values: ActivityFormValues,
): ActivityApiBody {
  const updated = applyFormValuesToActivity(activity, values)
  return activityDetailToApiBody(updated)
}

export async function listActivitiesApi(archived: boolean): Promise<ActivityListItem[]> {
  return fetchAllPages<ActivityListItem>(BASE, {
    archived: archived ? 'true' : 'false',
  })
}

export async function listActivitiesForRelatedApi(
  relatedType: string,
  relatedId: string,
): Promise<ActivityListItem[]> {
  const res = await fetchJSON<ApiItemResponse<ActivityListItem[]>>(
    `${BASE}/related/${relatedType}/${relatedId}`,
  )
  return res.data
}

export async function getActivityApi(id: string): Promise<ActivityDetail> {
  const res = await fetchJSON<ApiItemResponse<ActivityDetail>>(`${BASE}/${id}`)
  return res.data
}

export async function createActivityApi(body: ActivityApiBody): Promise<ActivityDetail> {
  const res = await fetchJSON<ApiItemResponse<ActivityDetail>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateActivityApi(
  id: string,
  body: Partial<ActivityApiBody>,
): Promise<ActivityDetail> {
  const res = await fetchJSON<ApiItemResponse<ActivityDetail>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function archiveActivityApi(id: string): Promise<ActivityListItem> {
  const res = await fetchJSON<ApiItemResponse<ActivityListItem>>(
    `${BASE}/${id}/archive`,
    { method: 'POST' },
  )
  return res.data
}

export async function restoreActivityApi(id: string): Promise<ActivityListItem> {
  const res = await fetchJSON<ApiItemResponse<ActivityListItem>>(
    `${BASE}/${id}/restore`,
    { method: 'POST' },
  )
  return res.data
}

export async function permanentlyDeleteActivityApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}
