import { isApiEnabled } from '@/api/config'
import { profileIdForUserRole, profileNameForId } from '@/data/profiles.mock'
import type { UserDetail } from '@/data/user-detail.mock'
import type { UserListItem, UserRole, UserStatus } from '@/data/users.mock'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim())
}

export const USER_ROLE_OPTIONS: { value: UserRole | string; label: string }[] = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Ventas', label: 'Ventas' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Operaciones', label: 'Operaciones' },
  { value: 'Invitado', label: 'Invitado' },
  { value: 'Soporte', label: 'Soporte' },
  { value: 'CS', label: 'CS (Customer Success)' },
]

/** Perfil de acceso sugerido al elegir un rol (coincide por nombre con perfiles del CRM). */
export const ROLE_DEFAULT_PROFILE_NAME: Record<string, string> = {
  Admin: 'Administrador',
  Manager: 'Ventas',
  Ventas: 'Ventas',
  Marketing: 'Ventas',
  CS: 'Ventas',
  Soporte: 'Solo lectura',
  Operaciones: 'Operaciones',
  Invitado: 'Cliente Invitado',
}

export function resolveProfileIdForRole(
  role: string,
  profiles: readonly { id: string; name: string }[],
): string {
  const target = ROLE_DEFAULT_PROFILE_NAME[role.trim()]
  if (target) {
    const found = profiles.find(
      (p) => p.name.trim().toLowerCase() === target.toLowerCase(),
    )
    if (found) return found.id
  }
  const mockId = profileIdForUserRole(role)
  const byMockId = profiles.find((p) => p.id === mockId)
  if (byMockId) return byMockId.id
  const lectura = profiles.find((p) =>
    p.name.trim().toLowerCase().includes('lectura'),
  )
  if (lectura) return lectura.id
  return profiles[0]?.id ?? mockId
}

export const USER_STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'Activo', label: 'Activo' },
  { value: 'Por verificar', label: 'Por verificar' },
  { value: 'Invitado', label: 'Invitado' },
  { value: 'Inactivo', label: 'Inactivo' },
]

export const USER_TIMEZONE_OPTIONS = [
  { value: 'America/Santiago', label: 'Chile — Santiago' },
  { value: 'America/Lima', label: 'Perú — Lima' },
  { value: 'America/Bogota', label: 'Colombia — Bogotá' },
  { value: 'America/Mexico_City', label: 'México — Ciudad de México' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina — Buenos Aires' },
  { value: 'UTC', label: 'UTC' },
]

export const USER_LANGUAGE_OPTIONS = [
  { value: 'Español (Chile)', label: 'Español (Chile)' },
  { value: 'Español (Latam)', label: 'Español (Latam)' },
  { value: 'English', label: 'English' },
  { value: 'Português', label: 'Português' },
]

export const USER_TEAM_PRESETS = [
  'Comercial',
  'Dirección',
  'Marketing',
  'Operaciones',
  'Soporte',
  'Producto',
]

export type UserFormValues = {
  name: string
  email: string
  role: string
  profileId: string
  status: UserStatus
  phone: string
  department: string
  jobTitle: string
  bio: string
  avatarUrl: string
  timezone: string
  language: string
  /** YYYY-MM-DD o vacío */
  birthDate: string
  twoFactorEnabled: boolean
  /** Equipos separados por coma. */
  teamsInput: string
  /** Empresa del cliente invitado (opcional, solo perfil Invitado). */
  guestCompanyId: string
  guestCompanyName: string
}

export function createDefaultUserFormValues(
  partial?: Partial<UserFormValues>,
  profileOptions: readonly { id: string; name: string }[] = [],
): UserFormValues {
  const role = partial?.role ?? 'Ventas'
  return {
    name: '',
    email: '',
    role,
    profileId:
      partial?.profileId ??
      resolveProfileIdForRole(role, profileOptions),
    status: 'Por verificar',
    phone: '',
    department: '',
    jobTitle: '',
    bio: '',
    avatarUrl: '',
    timezone: 'America/Santiago',
    language: 'Español (Chile)',
    birthDate: '',
    twoFactorEnabled: false,
    teamsInput: '',
    guestCompanyId: '',
    guestCompanyName: '',
    ...partial,
  }
}

export function teamsInputFromList(teams: string[]): string {
  return teams.filter(Boolean).join(', ')
}

export function parseTeamsInput(input: string): string[] {
  return input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function userDetailToFormValues(user: UserDetail): UserFormValues {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    profileId: user.profileId,
    status: user.status,
    phone: user.phone,
    department: user.department,
    jobTitle: user.jobTitle,
    bio: user.bio,
    avatarUrl: user.avatarUrl ?? '',
    timezone: user.timezone,
    language: user.language,
    birthDate: user.birthDate?.trim().slice(0, 10) || '',
    twoFactorEnabled: user.twoFactorEnabled,
    teamsInput: teamsInputFromList(user.teams),
    guestCompanyId: user.guestCompanyId ?? '',
    guestCompanyName: user.guestCompanyName ?? '',
  }
}

export function applyFormValuesToUser(
  user: UserDetail,
  values: UserFormValues,
): UserDetail {
  const teams = parseTeamsInput(values.teamsInput)
  const avatarUrl = values.avatarUrl.trim() || undefined

  return {
    ...user,
    name: values.name.trim(),
    email: values.email.trim(),
    role: values.role,
    profileId: values.profileId,
    status: values.status,
    phone: values.phone.trim(),
    department: values.department.trim(),
    jobTitle: values.jobTitle.trim(),
    bio: values.bio.trim(),
    avatarUrl,
    timezone: values.timezone,
    language: values.language,
    birthDate: values.birthDate.trim().slice(0, 10) || undefined,
    twoFactorEnabled: values.twoFactorEnabled,
    teams,
    permissions: user.permissions,
    guestCompanyId: values.guestCompanyId.trim() || undefined,
    guestCompanyName: values.guestCompanyName.trim() || undefined,
  }
}

export function listItemFromUserDetail(user: UserDetail): UserListItem {
  const profileId = user.profileId
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileId,
    profileName: profileNameForId(profileId),
    lastLogin: user.lastLogin,
    status: user.status,
    avatarUrl: user.avatarUrl,
    guestCompanyId: user.guestCompanyId,
    guestCompanyName: user.guestCompanyName,
  }
}

export function validateUserFormValues(values: UserFormValues): string | null {
  if (!values.name.trim()) return 'El nombre es obligatorio.'
  if (!values.email.trim()) return 'El correo electrónico es obligatorio.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    return 'Indica un correo electrónico válido.'
  }
  if (!values.role.trim()) return 'Selecciona un rol.'
  if (!values.profileId.trim()) return 'Selecciona un perfil de acceso.'
  if (isApiEnabled() && !isUuid(values.profileId)) {
    return 'Selecciona un perfil de acceso válido en la lista.'
  }
  if (!values.timezone.trim()) return 'Selecciona una zona horaria.'
  if (!values.language.trim()) return 'Selecciona un idioma.'
  return null
}
