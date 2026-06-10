import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse } from '@/api/types'
import type { UserDetail } from '@/data/user-detail.mock'
import { loadAuthSession } from '@/lib/auth-session'
import type { AccessProfile } from '@/types/access-profile'
import type { TenantBranding } from '@/lib/tenant-host'

const BASE = `${API_V1}/auth`

export type TenantMembershipOption = {
  tenantId: string
  slug: string
  displayName: string
  logoUrl: string
  isDefault: boolean
}

export type LoginCompleteResponse = {
  token: string
  user: UserDetail
  profile: AccessProfile
  tenantId: string
  isPlatformOperator?: boolean
  backupCodes?: string[]
}

export type LoginStepUser = {
  id: string
  email: string
  name: string
}

export type LoginApiResult =
  | ({ kind: 'complete' } & LoginCompleteResponse)
  | { kind: 'verify'; challengeId: string; user: LoginStepUser; tenantId: string }
  | { kind: 'enroll'; enrollmentToken: string; user: LoginStepUser; tenantId: string }

function parseLoginPayload(data: Record<string, unknown>): LoginApiResult {
  if (data.requiresTwoFactor && data.challengeId) {
    return {
      kind: 'verify',
      challengeId: String(data.challengeId),
      user: data.user as LoginStepUser,
      tenantId: String(data.tenantId ?? ''),
    }
  }
  if (data.requiresTwoFactorEnrollment && data.enrollmentToken) {
    return {
      kind: 'enroll',
      enrollmentToken: String(data.enrollmentToken),
      user: data.user as LoginStepUser,
      tenantId: String(data.tenantId ?? ''),
    }
  }
  return {
    kind: 'complete',
    token: String(data.token),
    user: data.user as UserDetail,
    profile: data.profile as AccessProfile,
    tenantId: String(data.tenantId ?? ''),
    isPlatformOperator: Boolean(data.isPlatformOperator),
    backupCodes: data.backupCodes as string[] | undefined,
  }
}

export async function fetchTenantByHostApi(host?: string): Promise<TenantBranding | null> {
  try {
    const query = host ? `?host=${encodeURIComponent(host)}` : ''
    const res = await fetchJSON<ApiItemResponse<TenantBranding>>(
      `${BASE}/tenant-by-host${query}`,
    )
    return res.data
  } catch {
    return null
  }
}

export async function identifyTenantsApi(
  email: string,
): Promise<TenantMembershipOption[]> {
  const res = await fetchJSON<
    ApiItemResponse<{ memberships: TenantMembershipOption[] }>
  >(`${BASE}/identify`, {
    method: 'POST',
    auth: false,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return res.data.memberships ?? []
}

export async function loginApi(
  email: string,
  password: string,
  tenantId?: string,
): Promise<LoginApiResult> {
  const res = await fetchJSON<ApiItemResponse<Record<string, unknown>>>(
    `${BASE}/login`,
    {
      method: 'POST',
      auth: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        ...(tenantId ? { tenantId } : {}),
      }),
    },
  )
  return parseLoginPayload(res.data)
}

export async function verifyTwoFactorLoginApi(
  challengeId: string,
  code: string,
  tenantId?: string,
): Promise<LoginCompleteResponse> {
  const res = await fetchJSON<ApiItemResponse<LoginCompleteResponse>>(
    `${BASE}/login/verify-2fa`,
    {
      method: 'POST',
      auth: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeId,
        code,
        ...(tenantId ? { tenantId } : {}),
      }),
    },
  )
  return res.data
}

export async function confirmEnrollmentLoginApi(
  enrollmentToken: string,
  code: string,
  setupId?: string,
  tenantId?: string,
): Promise<LoginCompleteResponse> {
  const res = await fetchJSON<ApiItemResponse<LoginCompleteResponse>>(
    `${BASE}/2fa/enrollment/confirm`,
    {
      method: 'POST',
      auth: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enrollmentToken,
        code,
        setupId,
        ...(tenantId ? { tenantId } : {}),
      }),
    },
  )
  return res.data
}

export async function logoutApi(token?: string): Promise<void> {
  const sessionToken = token ?? loadAuthSession()?.token
  if (!sessionToken) return
  await fetchJSON(`${BASE}/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'x-auth-token': sessionToken,
    },
  })
}

export async function fetchMeApi(): Promise<{
  user: UserDetail
  profile: AccessProfile
  tenantId: string
  tenantSlug: string
  isPlatformOperator: boolean
}> {
  const res = await fetchJSON<
    ApiItemResponse<{
      user: UserDetail
      profile: AccessProfile
      tenantId: string
      tenantSlug: string
      isPlatformOperator?: boolean
    }>
  >(`${BASE}/me`)
  return {
    ...res.data,
    isPlatformOperator: Boolean(res.data.isPlatformOperator),
  }
}

export async function switchTenantApi(tenantId: string): Promise<LoginCompleteResponse> {
  const res = await fetchJSON<ApiItemResponse<LoginCompleteResponse>>(
    `${BASE}/switch-tenant`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    },
  )
  return res.data
}
