import { isGuestAccessProfile } from './access-profile-admin.js'
import { forbidden } from '../middleware/errors.js'
import { getActorGuestCompany } from '../repositories/users.repository.js'
import type { AccessProfile } from '../types/access-profile.js'

export type ResolvedBitacoraCompanyScope = {
  companyId?: string
  companyName?: string
  /** Invitado sin empresa configurada: no debe ver datos de otras empresas. */
  guestWithoutCompany: boolean
}

export async function resolveBitacoraCompanyScopeForActor(input: {
  profile: AccessProfile | null | undefined
  userId: string
  tenantId: string
  requestedCompanyId?: string
}): Promise<ResolvedBitacoraCompanyScope> {
  if (!isGuestAccessProfile(input.profile)) {
    return {
      companyId: input.requestedCompanyId,
      guestWithoutCompany: false,
    }
  }

  const guest = await getActorGuestCompany(input.userId, input.tenantId)
  if (!guest.companyId) {
    return {
      companyName: guest.companyName || undefined,
      guestWithoutCompany: true,
    }
  }

  return {
    companyId: guest.companyId,
    companyName: guest.companyName || undefined,
    guestWithoutCompany: false,
  }
}

/** Invitado: solo registros de su empresa asignada. */
export async function assertGuestCanAccessBitacoraCompany(input: {
  profile: AccessProfile | null | undefined
  userId: string
  tenantId: string
  companyId: string | null | undefined
}): Promise<void> {
  if (!isGuestAccessProfile(input.profile)) return

  const scope = await resolveBitacoraCompanyScopeForActor({
    profile: input.profile,
    userId: input.userId,
    tenantId: input.tenantId,
  })

  if (scope.guestWithoutCompany || !scope.companyId) {
    throw forbidden('No tienes empresa asignada para consultar bitácoras.')
  }

  const entryCompanyId = input.companyId?.trim() || null
  if (!entryCompanyId || entryCompanyId !== scope.companyId) {
    throw forbidden('No puedes consultar registros de otra empresa.')
  }
}
