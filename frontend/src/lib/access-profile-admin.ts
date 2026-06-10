import type { AccessProfile, AccessProfileListItem } from '@/types/access-profile'

type ProfileRef = Pick<AccessProfile | AccessProfileListItem, 'isSystem' | 'systemKey'> | null | undefined

/** Perfil Administrador de la instancia (permisos configurables por operador de plataforma). */
export function isAdminAccessProfile(profile: ProfileRef): boolean {
  return profile?.systemKey === 'admin'
}

/**
 * Perfiles con acceso total fijo por perfil (legacy). El Administrador ya no aplica:
 * sus permisos se guardan en BD y los define el operador de plataforma.
 */
export function isSystemAccessProfile(profile: ProfileRef): boolean {
  if (!profile) return false
  if (profile.systemKey === 'admin' || profile.systemKey === 'guest') return false
  return Boolean(profile.isSystem)
}

/** Alcance amplio de listados (todas vs. propias) para admin y perfiles sistema legacy. */
export function hasElevatedTenantScope(profile: ProfileRef): boolean {
  if (!profile) return false
  return isAdminAccessProfile(profile) || isSystemAccessProfile(profile)
}

/** Perfil predefinido de instancia (Administrador o Invitado). */
export function isLockedAccessProfile(profile: ProfileRef): boolean {
  if (!profile) return false
  return profile.systemKey === 'admin' || profile.systemKey === 'guest' || Boolean(profile.isSystem)
}

export function isGuestAccessProfile(profile: ProfileRef): boolean {
  return profile?.systemKey === 'guest'
}

export function canModifyLockedProfile(
  profile: ProfileRef,
  isPlatformOperator: boolean,
): boolean {
  if (!isLockedAccessProfile(profile)) return true
  return isPlatformOperator
}

export function canEditProfilePermissions(
  profile: ProfileRef,
  isPlatformOperator: boolean,
): boolean {
  if (isAdminAccessProfile(profile)) return isPlatformOperator
  if (isSystemAccessProfile(profile)) return false
  if (isLockedAccessProfile(profile)) return isPlatformOperator
  return true
}

export function canRenameProfile(profile: ProfileRef, isPlatformOperator: boolean): boolean {
  if (isSystemAccessProfile(profile)) return false
  if (profile?.systemKey === 'guest') return isPlatformOperator
  if (isLockedAccessProfile(profile)) return false
  return true
}

export const SYSTEM_PROFILE_ACCESS_MESSAGE =
  'Este perfil tiene acceso total a todos los módulos del CRM. Los permisos no son configurables.'

export const ADMIN_PROFILE_LOCKED_MESSAGE =
  'Los permisos del perfil Administrador solo pueden modificarlos operadores de plataforma (superadmin).'

export const ADMIN_PROFILE_OPERATOR_MESSAGE =
  'Los cambios aplican a los usuarios con perfil Administrador. Tu acceso como operador de plataforma no se ve afectado y siempre tendrá acceso completo.'

export const LOCKED_PROFILE_MESSAGE =
  'Perfil predefinido de la instancia. Solo un operador de plataforma puede modificarlo.'
