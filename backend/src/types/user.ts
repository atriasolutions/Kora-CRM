export type UserStatus = 'Activo' | 'Invitado' | 'Inactivo' | 'Por verificar'

export type UserSessionEntry = {
  device: string
  location: string
  when: string
}

export type UserListItem = {
  id: string
  name: string
  email: string
  role: string
  profileId: string
  profileName: string
  lastLogin: string
  status: UserStatus
  avatarUrl?: string
  guestCompanyId?: string
  guestCompanyName?: string
}

export type UserDetail = UserListItem & {
  profileId: string
  phone: string
  department: string
  jobTitle: string
  timezone: string
  language: string
  /** Fecha de nacimiento YYYY-MM-DD (opcional). */
  birthDate?: string
  memberSince: string
  twoFactorEnabled: boolean
  /** App autenticadora vinculada (TOTP confirmado). */
  twoFactorConfigured: boolean
  bio: string
  recentSessions: UserSessionEntry[]
  /** Empresa del cliente invitado (solo perfil guest). */
  guestCompanyId?: string
  guestCompanyName?: string
}

/** Cumpleaños visibles en el tenant (solo miembros de esa instancia). */
export type TenantBirthdayItem = {
  id: string
  name: string
  avatarUrl?: string
  /** YYYY-MM-DD */
  birthDate: string
}

export type CreateUserInput = {
  name: string
  email: string
  role?: string
  profileId: string
  status?: UserStatus
  avatarUrl?: string
  phone?: string
  department?: string
  jobTitle?: string
  timezone?: string
  language?: string
  /** YYYY-MM-DD o null para limpiar. */
  birthDate?: string | null
  bio?: string
  password?: string
  /** Si true y sin contraseña, envía correo de activación (por defecto true). */
  sendInvite?: boolean
  twoFactorEnabled?: boolean
  guestCompanyId?: string | null
}

export type UpdateUserInput = Partial<CreateUserInput>
