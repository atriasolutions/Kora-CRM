import { fetchJSON } from '@/api/client'
import type { ApiListResponse } from '@/api/types'

export async function fetchAllPages<T>(
  listPath: string,
  params: Record<string, string | undefined> = {},
  pageSize = 100,
): Promise<T[]> {
  const items: T[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const search = new URLSearchParams()
    search.set('page', String(page))
    search.set('pageSize', String(pageSize))
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') search.set(key, value)
    }
    const qs = search.toString()
    const res = await fetchJSON<ApiListResponse<T>>(
      `${listPath}${qs ? `?${qs}` : ''}`,
    )
    items.push(...res.data)
    totalPages = res.meta.totalPages
    page += 1
  }

  return items
}
