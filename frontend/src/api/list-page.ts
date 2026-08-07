import { fetchJSON } from '@/api/client'
import type { ApiListResponse } from '@/api/types'

export type ListPageParams = {
  page: number
  pageSize: number
  q?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  extra?: Record<string, string | undefined>
}

export type ListPageResult<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** Una página de listado desde la API (sin traer todo el catálogo al cliente). */
export async function fetchListPage<T>(
  listPath: string,
  params: ListPageParams,
): Promise<ListPageResult<T>> {
  const search = new URLSearchParams()
  search.set('page', String(params.page))
  search.set('pageSize', String(params.pageSize))
  if (params.q?.trim()) search.set('q', params.q.trim())
  if (params.sortBy?.trim()) search.set('sortBy', params.sortBy.trim())
  if (params.sortDir) search.set('sortDir', params.sortDir)
  for (const [key, value] of Object.entries(params.extra ?? {})) {
    if (value !== undefined && value !== '') search.set(key, value)
  }
  const qs = search.toString()
  const res = await fetchJSON<ApiListResponse<T>>(
    `${listPath}${qs ? `?${qs}` : ''}`,
  )
  return {
    items: res.data,
    total: res.meta.total,
    page: res.meta.page,
    pageSize: res.meta.pageSize,
    totalPages: res.meta.totalPages,
  }
}
