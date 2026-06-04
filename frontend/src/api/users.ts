import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type { UserDetail } from '@/data/user-detail.mock'
import type { UserListItem } from '@/data/users.mock'
import type { UserFormValues } from '@/lib/user-form'
import { resolveEntityImageSrc } from '@/lib/image-upload'

const BASE = `${API_V1}/users`

function normalizeUserListItem(user: UserListItem): UserListItem {
  return {
    ...user,
    avatarUrl: resolveEntityImageSrc(user.avatarUrl),
  }
}

function normalizeUserDetail(user: UserDetail): UserDetail {
  return {
    ...user,
    avatarUrl: resolveEntityImageSrc(user.avatarUrl),
  }
}

export type UserApiBody = {
  name: string
  email: string
  role?: string
  profileId: string
  status?: string
  avatarUrl?: string
  phone?: string
  department?: string
  jobTitle?: string
  timezone?: string
  language?: string
  bio?: string
  password?: string
  sendInvite?: boolean
  twoFactorEnabled?: boolean
}

export function userFormToApiBody(
  values: UserFormValues,
  options?: { sendInvite?: boolean },
): UserApiBody {
  const sendInvite =
    options?.sendInvite ??
    (values.status === 'Por verificar' || values.status === 'Invitado')
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    role: values.role.trim(),
    profileId: values.profileId,
    status: values.status,
    sendInvite,
    avatarUrl: values.avatarUrl?.trim() || undefined,
    phone: values.phone?.trim() || undefined,
    department: values.department?.trim() || undefined,
    jobTitle: values.jobTitle?.trim() || undefined,
    timezone: values.timezone,
    language: values.language,
    bio: values.bio?.trim() || undefined,
    twoFactorEnabled: values.twoFactorEnabled,
  }
}

export function userDetailToApiBody(detail: UserDetail): UserApiBody {
  return {
    name: detail.name,
    email: detail.email,
    role: detail.role,
    profileId: detail.profileId,
    status: detail.status,
    avatarUrl: detail.avatarUrl,
    phone: detail.phone,
    department: detail.department,
    jobTitle: detail.jobTitle,
    timezone: detail.timezone,
    language: detail.language,
    bio: detail.bio,
    twoFactorEnabled: detail.twoFactorEnabled,
  }
}

export async function listUsersApi(): Promise<UserListItem[]> {
  const rows = await fetchAllPages<UserListItem>(BASE, {})
  return rows.map(normalizeUserListItem)
}

/** Directorio para asignar responsables (perfil sin módulo Usuarios). */
export async function listUserAssigneesApi(): Promise<UserListItem[]> {
  const res = await fetchJSON<ApiItemResponse<UserListItem[]>>(`${BASE}/assignees`)
  return res.data.map(normalizeUserListItem)
}

export async function getUserApi(id: string): Promise<UserDetail> {
  const res = await fetchJSON<ApiItemResponse<UserDetail>>(`${BASE}/${id}`)
  return normalizeUserDetail(res.data)
}

export async function createUserApi(body: UserApiBody): Promise<UserDetail> {
  const res = await fetchJSON<ApiItemResponse<UserDetail>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return normalizeUserDetail(res.data)
}

export async function updateUserApi(id: string, body: Partial<UserApiBody>): Promise<UserDetail> {
  const res = await fetchJSON<ApiItemResponse<UserDetail>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return normalizeUserDetail(res.data)
}

export async function deleteUserApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}

export async function resendInvitationApi(
  userId: string,
): Promise<{ emailed: boolean; expiresHours: number }> {
  const res = await fetchJSON<
    ApiItemResponse<{ emailed: boolean; expiresHours: number }>
  >(`${BASE}/${userId}/resend-invitation`, { method: 'POST' })
  return res.data
}
