import { ANONYMOUS_CURRENT_USER } from '@/lib/production-empty-data'
import { loadAuthSession } from '@/lib/auth-session'

export type CurrentUser = {
  id: string
  name: string
  email: string
}

/** Usuario conectado (sesión). Sin sesión: valores vacíos, nunca datos demo. */
export function getCurrentUser(): CurrentUser {
  const session = loadAuthSession()
  if (session) {
    return {
      id: session.userId,
      name: session.name,
      email: session.email,
    }
  }
  return { ...ANONYMOUS_CURRENT_USER }
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
