import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse } from '@/api/types'
import type { GlobalSearchResponse } from '@/types/global-search'

const BASE = `${API_V1}/search`

export async function globalSearchApi(
  q: string,
  limit = 5,
): Promise<GlobalSearchResponse> {
  const params = new URLSearchParams({ q: q.trim(), limit: String(limit) })
  const res = await fetchJSON<ApiItemResponse<GlobalSearchResponse>>(
    `${BASE}?${params.toString()}`,
  )
  return res.data
}
