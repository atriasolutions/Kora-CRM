import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse } from '@/api/types'

export type TwoFactorStatus = {
  policyEnabled: boolean
  configured: boolean
  required: boolean
  pendingEnrollment: boolean
}

export type TotpSetupPayload = {
  setupId: string
  otpauthUrl: string
  qrDataUrl: string
  secret: string
  enrollmentToken?: string
}

const AUTH_BASE = `${API_V1}/auth`
const USERS_BASE = `${API_V1}/users`

function user2faBase(userId: string, isSelf: boolean) {
  return isSelf ? AUTH_BASE : `${USERS_BASE}/${userId}`
}

export async function fetchTwoFactorStatusApi(
  userId: string,
  isSelf: boolean,
): Promise<TwoFactorStatus> {
  const res = await fetchJSON<ApiItemResponse<TwoFactorStatus>>(
    `${user2faBase(userId, isSelf)}/2fa/status`,
  )
  return res.data
}

export async function startTwoFactorSetupApi(
  userId: string,
  isSelf: boolean,
): Promise<TotpSetupPayload> {
  const res = await fetchJSON<ApiItemResponse<TotpSetupPayload>>(
    `${user2faBase(userId, isSelf)}/2fa/setup`,
    { method: 'POST' },
  )
  return res.data
}

export async function confirmTwoFactorSetupApi(
  userId: string,
  isSelf: boolean,
  code: string,
  setupId?: string,
): Promise<{ backupCodes: string[]; configured: boolean }> {
  const res = await fetchJSON<
    ApiItemResponse<{ backupCodes: string[]; configured: boolean }>
  >(`${user2faBase(userId, isSelf)}/2fa/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, setupId }),
  })
  return res.data
}

export async function disableTwoFactorApi(
  userId: string,
  isSelf: boolean,
  password: string,
  code: string,
): Promise<void> {
  await fetchJSON(`${user2faBase(userId, isSelf)}/2fa/disable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, code }),
  })
}

export async function adminResetTwoFactorApi(userId: string): Promise<void> {
  await fetchJSON(`${USERS_BASE}/${userId}/2fa/reset`, { method: 'POST' })
}

export async function enrollmentSetupApi(
  enrollmentToken: string,
): Promise<TotpSetupPayload> {
  const res = await fetchJSON<ApiItemResponse<TotpSetupPayload>>(
    `${AUTH_BASE}/2fa/enrollment/setup`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentToken }),
    },
  )
  return res.data
}
