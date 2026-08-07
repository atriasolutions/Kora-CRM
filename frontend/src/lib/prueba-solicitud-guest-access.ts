import type { ProfileRef } from '@/lib/access-profile-admin'
import { isGuestAccessProfile } from '@/lib/access-profile-admin'

export type PruebaCasoGuestField = 'clientOk' | 'clientNotes'

export function isGuestPruebaEditor(profile: ProfileRef | null | undefined): boolean {
  return isGuestAccessProfile(profile)
}

export function canGuestEditPruebaCaseField(
  profile: ProfileRef | null | undefined,
  field: string,
): boolean {
  if (!isGuestAccessProfile(profile)) return true
  return field === 'clientOk' || field === 'clientNotes'
}

export function canGuestCreatePrueba(profile: ProfileRef | null | undefined): boolean {
  return !isGuestAccessProfile(profile)
}

export function canGuestArchivePrueba(profile: ProfileRef | null | undefined): boolean {
  return !isGuestAccessProfile(profile)
}
