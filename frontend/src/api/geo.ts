import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse } from '@/api/types'
import type { GeoCatalog } from '@/types/geo'

const BASE = `${API_V1}/geo`

export async function getChileGeoCatalogApi(): Promise<GeoCatalog> {
  const res = await fetchJSON<ApiItemResponse<GeoCatalog>>(`${BASE}/chile`)
  return res.data
}
