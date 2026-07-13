import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse, ApiListResponse } from '@/api/types'
import type { ProductCategorySetting } from '@/types/catalog-settings'

const BASE = `${API_V1}/product-categories`

export async function listProductCategoriesApi(): Promise<ProductCategorySetting[]> {
  const res = await fetchJSON<ApiListResponse<ProductCategorySetting>>(BASE)
  return res.data
}

export async function createProductCategoryApi(body: {
  name: string
  active?: boolean
  parentId?: string | null
}): Promise<ProductCategorySetting> {
  const res = await fetchJSON<ApiItemResponse<ProductCategorySetting>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateProductCategoryApi(
  id: string,
  body: Partial<ProductCategorySetting>,
): Promise<ProductCategorySetting> {
  const res = await fetchJSON<ApiItemResponse<ProductCategorySetting>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteProductCategoryApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}
