import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse, ApiListResponse } from '@/api/types'
import type {
  ContactPortabilityExport,
  CreatePrivacyRequestInput,
  CreateSecurityIncidentInput,
  PrivacyRequest,
  SecurityIncident,
  UpdatePrivacyRequestInput,
  UpdateSecurityIncidentInput,
} from '@/types/privacy'

const BASE = `${API_V1}/privacy`

export async function listPrivacyRequestsApi(): Promise<PrivacyRequest[]> {
  const res = await fetchJSON<ApiListResponse<PrivacyRequest>>(`${BASE}/requests`)
  return res.data
}

export async function createPrivacyRequestApi(
  body: CreatePrivacyRequestInput,
): Promise<PrivacyRequest> {
  const res = await fetchJSON<ApiItemResponse<PrivacyRequest>>(`${BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updatePrivacyRequestApi(
  id: string,
  body: UpdatePrivacyRequestInput,
): Promise<PrivacyRequest> {
  const res = await fetchJSON<ApiItemResponse<PrivacyRequest>>(`${BASE}/requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function exportContactPortabilityApi(
  contactId: string,
): Promise<ContactPortabilityExport> {
  const res = await fetchJSON<ApiItemResponse<ContactPortabilityExport>>(
    `${BASE}/contacts/${contactId}/portability`,
  )
  return res.data
}

export async function blockContactTreatmentApi(contactId: string): Promise<void> {
  await fetchJSON(`${BASE}/contacts/${contactId}/block`, { method: 'POST' })
}

export async function unblockContactTreatmentApi(contactId: string): Promise<void> {
  await fetchJSON(`${BASE}/contacts/${contactId}/unblock`, { method: 'POST' })
}

export async function listSecurityIncidentsApi(): Promise<SecurityIncident[]> {
  const res = await fetchJSON<ApiListResponse<SecurityIncident>>(`${BASE}/security-incidents`)
  return res.data
}

export async function createSecurityIncidentApi(
  body: CreateSecurityIncidentInput,
): Promise<SecurityIncident> {
  const res = await fetchJSON<ApiItemResponse<SecurityIncident>>(`${BASE}/security-incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateSecurityIncidentApi(
  id: string,
  body: UpdateSecurityIncidentInput,
): Promise<SecurityIncident> {
  const res = await fetchJSON<ApiItemResponse<SecurityIncident>>(
    `${BASE}/security-incidents/${id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  return res.data
}
