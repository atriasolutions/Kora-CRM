import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse } from '@/api/types'
import type { MentionItem } from '@/lib/mentions'

const BASE = `${API_V1}/mentions`

export async function searchMentionsApi(
  query: string,
  limit = 12,
): Promise<MentionItem[]> {
  const params = new URLSearchParams()
  if (query.trim()) params.set('q', query.trim())
  params.set('limit', String(limit))
  const res = await fetchJSON<ApiItemResponse<MentionItem[]>>(
    `${BASE}?${params.toString()}`,
  )
  return res.data
}

export async function listActiveUsersForMentionsApi(): Promise<MentionItem[]> {
  return searchMentionsApi('', 50).then((items) =>
    items.filter((item) => item.kind === 'user'),
  )
}
