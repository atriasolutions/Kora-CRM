import type { AccessProfile } from '../types/access-profile.js'

/** Perfil de sistema (Administrador): acceso total y permisos no configurables. */
export function isSystemAccessProfile(
  profile: Pick<AccessProfile, 'isSystem'> | null | undefined,
): boolean {
  return Boolean(profile?.isSystem)
}
