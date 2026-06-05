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
}

export type UserDetail = UserListItem & {
  profileId: string
  phone: string
  department: string
  jobTitle: string
  timezone: string
  language: string
  memberSince: string
  twoFactorEnabled: boolean
  /** App autenticadora vinculada (TOTP confirmado). */
  twoFactorConfigured: boolean
  bio: string
  recentSessions: UserSessionEntry[]
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
  bio?: string
  password?: string
  /** Si true y sin contraseña, envía correo de activación (por defecto true). */
  sendInvite?: boolean
  twoFactorEnabled?: boolean
}

export type UpdateUserInput = Partial<CreateUserInput>
