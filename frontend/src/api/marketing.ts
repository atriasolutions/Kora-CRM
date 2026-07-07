import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse } from '@/api/types'

const BASE = `${API_V1}/marketing`

export type TrialLeadBody = {
  name: string
  company: string
  rut: string
  employees: string
  address: string
  region: string
  commune: string
  email: string
  phone: string
  message?: string
  privacyConsentAccepted: true
  privacyPolicyVersion?: string
}

export type TrialLeadSubmission = {
  received: boolean
  emailed?: boolean
  companyId?: string
  contactId?: string
  opportunityId?: string
  trial?: {
    provisioned: boolean
    slug?: string
    loginUrl?: string
    trialDays?: number
    welcomeEmailed?: boolean
    error?: string
  }
}

export async function submitTrialLeadApi(
  body: TrialLeadBody,
): Promise<TrialLeadSubmission> {
  const res = await fetchJSON<ApiItemResponse<TrialLeadSubmission>>(
    `${BASE}/trial-lead`,
    {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.data
}

export type SupportRequestBody = {
  name: string
  email: string
  company?: string
  topic: 'technical' | 'access' | 'usage' | 'billing' | 'other'
  message: string
  privacyConsentAccepted: true
  privacyPolicyVersion?: string
}

export async function submitSupportRequestApi(
  body: SupportRequestBody,
): Promise<{ received: boolean }> {
  const res = await fetchJSON<ApiItemResponse<{ received: boolean }>>(
    `${BASE}/support-request`,
    {
      method: 'POST',
      auth: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  return res.data
}
