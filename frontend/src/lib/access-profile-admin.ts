import type { AccessProfile, AccessProfileListItem } from '@/types/access-profile'

type SystemProfileRef = Pick<AccessProfile | AccessProfileListItem, 'isSystem'> | null | undefined

/** Perfil de sistema (Administrador): acceso total y permisos no configurables. */
export function isSystemAccessProfile(profile: SystemProfileRef): boolean {
  return Boolean(profile?.isSystem)
}

export const SYSTEM_PROFILE_ACCESS_MESSAGE =
  'Este perfil tiene acceso total a todos los módulos del CRM. Los permisos no son configurables.'
