import { createContext } from 'react'

import type { LoginApiResult } from '@/api/auth'
import type { AuthSession } from '@/lib/auth-session'
import type { AccessProfile } from '@/types/access-profile'

export type LoginOutcome =
  | { status: 'ok' }
  | { status: 'error'; message: string }
  | { status: 'verify'; challengeId: string; userEmail: string; tenantId: string }
  | { status: 'enroll'; enrollmentToken: string; userEmail: string; tenantId: string }

export type AuthMembershipContext = {
  guestCompanyId?: string
  guestCompanyName?: string
}

export type AuthContextValue = {
  session: AuthSession | null
  /** Perfil de acceso del usuario conectado (API). */
  profile: AccessProfile | null
  /** Empresa vinculada al invitado (membresía del tenant). */
  membership: AuthMembershipContext | null
  isAuthenticated: boolean
  isReady: boolean
  login: (email: string, password: string, tenantId?: string, tenantSlug?: string) => Promise<LoginOutcome>
  completeTwoFactorLogin: (
    challengeId: string,
    code: string,
    tenantId?: string,
  ) => Promise<LoginOutcome>
  completeEnrollmentLogin: (
    enrollmentToken: string,
    code: string,
    setupId?: string,
    tenantId?: string,
  ) => Promise<LoginOutcome & { backupCodes?: string[] }>
  logout: () => Promise<void>
  /** Recarga permisos desde la API (p. ej. tras editar el perfil de acceso). */
  refreshProfile: () => Promise<void>
}

export type { LoginApiResult }

export const AuthContext = createContext<AuthContextValue | null>(null)
