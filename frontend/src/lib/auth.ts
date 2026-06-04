import { userListSeed } from '@/data/users.mock'
import type { AuthSession } from '@/lib/auth-session'

/** Contraseña demo para todos los usuarios activos del seed. */
export const DEMO_LOGIN_PASSWORD = 'kora123'

export function authenticateUser(
  email: string,
  password: string,
): { ok: true; session: AuthSession } | { ok: false; message: string } {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) {
    return { ok: false, message: 'Indica tu correo electrónico.' }
  }
  if (!password) {
    return { ok: false, message: 'Indica tu contraseña.' }
  }
  if (password !== DEMO_LOGIN_PASSWORD) {
    return { ok: false, message: 'Correo o contraseña incorrectos.' }
  }

  const user = userListSeed.find(
    (u) => u.email.trim().toLowerCase() === normalizedEmail,
  )
  if (!user) {
    return { ok: false, message: 'Correo o contraseña incorrectos.' }
  }
  if (user.status !== 'Activo') {
    return {
      ok: false,
      message:
        user.status === 'Invitado'
          ? 'Tu cuenta está pendiente de activación. Revisa tu correo de invitación.'
          : 'Tu cuenta está inactiva. Contacta a un administrador.',
    }
  }

  return {
    ok: true,
    session: {
      userId: user.id,
      email: user.email,
      name: user.name,
    },
  }
}
