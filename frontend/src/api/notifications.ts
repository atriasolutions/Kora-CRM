import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse } from '@/api/types'
import type {
  NotificationItem,
  NotificationListResponse,
} from '@/types/notification'

const BASE = `${API_V1}/notifications`

type ListNotificationsApiResponse = {
  items: NotificationItem[]
  unreadCount: number
}

export async function listNotificationsApi(args?: {
  unreadOnly?: boolean
  limit?: number
}): Promise<NotificationListResponse> {
  const unreadOnly = args?.unreadOnly === true ? 'true' : 'false'
  const limit = args?.limit ?? 20
  const res = await fetchJSON<ApiItemResponse<ListNotificationsApiResponse>>(
    `${BASE}?unreadOnly=${unreadOnly}&limit=${limit}`,
  )
  return res.data as unknown as NotificationListResponse
}

export async function markAllNotificationsReadApi(): Promise<void> {
  await fetchJSON(`${BASE}/read-all`, { method: 'PATCH' })
}

export async function clearAllNotificationsApi(): Promise<void> {
  await fetchJSON(BASE, { method: 'DELETE' })
}

export async function markNotificationReadApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}/read`, { method: 'PATCH' })
}

export async function sendMentionNotificationsApi(input: {
  mentionedUserNames?: string[]
  mentionedUserIds?: string[]
  href?: string
  entityType?: string
  entityId?: string
}): Promise<void> {
  await fetchJSON(`${BASE}/mentions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

