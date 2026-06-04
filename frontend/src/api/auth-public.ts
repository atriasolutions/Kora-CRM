import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import type { ApiItemResponse } from '@/api/types'

export type SecurityQuestionOption = {
  id: string
  prompt: string
}

export type VerifyTokenResult =
  | { valid: false }
  | {
      valid: true
      email: string
      name: string
      purpose: 'account_setup' | 'password_reset'
      expiresHours: number
    }

export async function listSecurityQuestionsApi(): Promise<SecurityQuestionOption[]> {
  const res = await fetchJSON<ApiItemResponse<SecurityQuestionOption[]>>(
    `${API_V1}/auth/security-questions`,
  )
  return res.data
}

export async function verifyTokenApi(
  token: string,
  purpose: 'account_setup' | 'password_reset',
): Promise<VerifyTokenResult> {
  const q = new URLSearchParams({ token, purpose })
  const res = await fetchJSON<ApiItemResponse<VerifyTokenResult>>(
    `${API_V1}/auth/verify-token?${q}`,
  )
  return res.data
}

export async function activateAccountApi(body: {
  token: string
  password: string
  questionId: string
  securityAnswer: string
}): Promise<{ ok: boolean; email: string }> {
  const res = await fetchJSON<ApiItemResponse<{ ok: boolean; email: string }>>(
    `${API_V1}/auth/activate-account`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  return res.data
}

export async function forgotPasswordApi(
  email: string,
): Promise<{ message: string }> {
  const res = await fetchJSON<ApiItemResponse<{ message: string }>>(
    `${API_V1}/auth/forgot-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    },
  )
  return res.data
}

export async function resetPasswordApi(body: {
  token: string
  password: string
}): Promise<{ ok: boolean }> {
  const res = await fetchJSON<ApiItemResponse<{ ok: boolean }>>(
    `${API_V1}/auth/reset-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  return res.data
}
