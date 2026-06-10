import type { BitacoraFilters } from '@/lib/bitacora-filters'
import { isGuestAccessProfile } from '@/lib/access-profile-admin'
import type { AccessProfile } from '@/types/access-profile'

export type GuestCompanyRef = {
  id: string
  name: string
}

/** Filtro imposible cuando el invitado no tiene empresa configurada. */
export const GUEST_NO_COMPANY_FILTER_ID = '00000000-0000-0000-0000-000000000000'

export function guestCompanyFromAuthUser(
  user: { guestCompanyId?: string; guestCompanyName?: string } | null | undefined,
): GuestCompanyRef | null {
  const id = user?.guestCompanyId?.trim() ?? ''
  if (!id) return null
  return {
    id,
    name: user?.guestCompanyName?.trim() || 'Empresa',
  }
}

/** Filtros forzados a la empresa del invitado (listado y dashboard). */
export function bitacoraFiltersForGuest(
  filters: BitacoraFilters,
  profile: Pick<AccessProfile, 'isSystem' | 'systemKey'> | null | undefined,
  guestCompany: GuestCompanyRef | null,
): BitacoraFilters {
  if (!isGuestAccessProfile(profile)) return filters
  if (!guestCompany) {
    return {
      ...filters,
      companyId: GUEST_NO_COMPANY_FILTER_ID,
      companyName: '',
    }
  }
  return {
    ...filters,
    companyId: guestCompany.id,
    companyName: guestCompany.name,
  }
}

/** @deprecated Usar bitacoraFiltersForGuest */
export const bitacoraDashboardFiltersForGuest = bitacoraFiltersForGuest

export function isGuestBitacoraDashboardLocked(
  profile: Pick<AccessProfile, 'isSystem' | 'systemKey'> | null | undefined,
): boolean {
  return isGuestAccessProfile(profile)
}
