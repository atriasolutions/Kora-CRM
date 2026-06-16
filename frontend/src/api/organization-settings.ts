import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse } from '@/api/types'
import type { OrganizationSettings } from '@/types/organization-settings'

const BASE = `${API_V1}/organization-settings`

export async function getOrganizationSettingsApi(): Promise<OrganizationSettings> {
  const res = await fetchJSON<ApiItemResponse<OrganizationSettings>>(BASE)
  return res.data
}

export async function updateOrganizationSettingsApi(
  body: Partial<OrganizationSettings>,
): Promise<OrganizationSettings> {
  const payload = Object.fromEntries(
    Object.entries(body).filter(
      ([key, value]) => key !== 'id' && value !== undefined,
    ),
  )
  const res = await fetchJSON<ApiItemResponse<OrganizationSettings>>(BASE, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.data
}
