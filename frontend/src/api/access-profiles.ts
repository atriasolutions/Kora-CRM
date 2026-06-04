import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse, ApiListResponse } from '@/api/types'
import { normalizeProfilePermissions } from '@/lib/menu-modules'
import type { AccessProfile, AccessProfileListItem } from '@/types/access-profile'

function normalizeAccessProfile(profile: AccessProfile): AccessProfile {
  return {
    ...profile,
    permissions: normalizeProfilePermissions(profile.permissions),
  }
}

const BASE = `${API_V1}/access-profiles`

export type AccessProfileApiBody = {
  name: string
  description?: string
  permissions: AccessProfile['permissions']
}

export async function listAccessProfilesApi(): Promise<AccessProfileListItem[]> {
  const res = await fetchJSON<ApiListResponse<AccessProfileListItem>>(BASE)
  return res.data
}

export async function getAccessProfileApi(id: string): Promise<AccessProfile> {
  const res = await fetchJSON<ApiItemResponse<AccessProfile>>(`${BASE}/${id}`)
  return normalizeAccessProfile(res.data)
}

export async function createAccessProfileApi(
  body: AccessProfileApiBody,
): Promise<AccessProfile> {
  const res = await fetchJSON<ApiItemResponse<AccessProfile>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return normalizeAccessProfile(res.data)
}

export async function updateAccessProfileApi(
  id: string,
  body: Partial<AccessProfileApiBody>,
): Promise<AccessProfile> {
  const res = await fetchJSON<ApiItemResponse<AccessProfile>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return normalizeAccessProfile(res.data)
}

export async function deleteAccessProfileApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}
