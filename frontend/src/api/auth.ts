import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse } from '@/api/types'
import type { UserDetail } from '@/data/user-detail.mock'
import type { AccessProfile } from '@/types/access-profile'

const BASE = `${API_V1}/auth`

export type LoginCompleteResponse = {
  token: string
  user: UserDetail
  profile: AccessProfile
  backupCodes?: string[]
}

export type LoginStepUser = {
  id: string
  email: string
  name: string
}

export type LoginApiResult =
  | ({ kind: 'complete' } & LoginCompleteResponse)
  | { kind: 'verify'; challengeId: string; user: LoginStepUser }
  | { kind: 'enroll'; enrollmentToken: string; user: LoginStepUser }

function parseLoginPayload(data: Record<string, unknown>): LoginApiResult {
  if (data.requiresTwoFactor && data.challengeId) {
    return {
      kind: 'verify',
      challengeId: String(data.challengeId),
      user: data.user as LoginStepUser,
    }
  }
  if (data.requiresTwoFactorEnrollment && data.enrollmentToken) {
    return {
      kind: 'enroll',
      enrollmentToken: String(data.enrollmentToken),
      user: data.user as LoginStepUser,
    }
  }
  return {
    kind: 'complete',
    token: String(data.token),
    user: data.user as UserDetail,
    profile: data.profile as AccessProfile,
    backupCodes: data.backupCodes as string[] | undefined,
  }
}

export async function loginApi(
  email: string,
  password: string,
): Promise<LoginApiResult> {
  const res = await fetchJSON<ApiItemResponse<Record<string, unknown>>>(
    `${BASE}/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
  )
  return parseLoginPayload(res.data)
}

export async function verifyTwoFactorLoginApi(
  challengeId: string,
  code: string,
): Promise<LoginCompleteResponse> {
  const res = await fetchJSON<ApiItemResponse<LoginCompleteResponse>>(
    `${BASE}/login/verify-2fa`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, code }),
    },
  )
  return res.data
}

export async function confirmEnrollmentLoginApi(
  enrollmentToken: string,
  code: string,
  setupId?: string,
): Promise<LoginCompleteResponse> {
  const res = await fetchJSON<ApiItemResponse<LoginCompleteResponse>>(
    `${BASE}/2fa/enrollment/confirm`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentToken, code, setupId }),
    },
  )
  return res.data
}

export async function logoutApi(): Promise<void> {
  await fetchJSON(`${BASE}/logout`, { method: 'POST' })
}

export async function fetchMeApi(): Promise<{ user: UserDetail; profile: AccessProfile }> {
  const res = await fetchJSON<
    ApiItemResponse<{ user: UserDetail; profile: AccessProfile }>
  >(`${BASE}/me`)
  return res.data
}
