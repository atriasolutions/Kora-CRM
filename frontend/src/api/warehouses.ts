import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse, ApiListResponse } from '@/api/types'
import type { WarehouseSetting } from '@/types/catalog-settings'

const BASE = `${API_V1}/warehouses`

export async function listWarehousesApi(): Promise<WarehouseSetting[]> {
  const res = await fetchJSON<ApiListResponse<WarehouseSetting>>(BASE)
  return res.data
}

export async function createWarehouseApi(body: {
  name: string
  code?: string
  address?: string
  region?: string
  commune?: string
  isDefault?: boolean
  active?: boolean
}): Promise<WarehouseSetting> {
  const res = await fetchJSON<ApiItemResponse<WarehouseSetting>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateWarehouseApi(
  id: string,
  body: Partial<WarehouseSetting>,
): Promise<WarehouseSetting> {
  const res = await fetchJSON<ApiItemResponse<WarehouseSetting>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteWarehouseApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}
