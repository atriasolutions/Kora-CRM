import { loadAuthSession } from '@/lib/auth-session'

export type CurrentUser = {
  id: string
  name: string
  email: string
}

const FALLBACK: CurrentUser = {
  id: 'u1',
  name: 'María López',
  email: 'maria.lopez@kora.io',
}

/** Usuario conectado (sesión o fallback demo). */
export function getCurrentUser(): CurrentUser {
  const session = loadAuthSession()
  if (session) {
    return {
      id: session.userId,
      name: session.name,
      email: session.email,
    }
  }
  return FALLBACK
}

export function getCurrentUserName(): string {
  return getCurrentUser().name
}

/** @deprecated Usar getCurrentUser() — mantiene compatibilidad con getters. */
export const CURRENT_USER = {
  get id() {
    return getCurrentUser().id
  },
  get name() {
    return getCurrentUser().name
  },
}

/** @deprecated Usar getCurrentUserName() */
export const CURRENT_USER_NAME = getCurrentUserName()
