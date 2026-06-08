import { useMemo, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import { AccessControlContext } from '@/contexts/access-control-context'
import { getUserDetail } from '@/data/user-detail.mock'
import { DEFAULT_PROFILE_ID } from '@/data/profiles.mock'
import { useAuth } from '@/hooks/use-auth'
import { useProfilesRegistry } from '@/hooks/use-profiles-registry'
import {
  canAccessPath as checkPath,
  canModule,
  filterNavSections,
  getProfilePermissionMap,
  permissionMap,
} from '@/lib/access-control'
import { getCurrentUser } from '@/lib/current-user'
import { createFullModulePermissions } from '@/lib/menu-modules'
import type { MenuModuleId, PermissionAction } from '@/lib/menu-modules'
import { navSections } from '@/navigation'

export function AccessControlProvider({ children }: { children: ReactNode }) {
  const { findById, profiles } = useProfilesRegistry()
  const { session, profile: authProfile } = useAuth()
  const isPlatformOperator = Boolean(session?.isPlatformOperator)

  const profileId = useMemo(() => {
    if (authProfile?.id) return authProfile.id
    if (session?.profileId) return session.profileId
    if (!isApiEnabled()) {
      const user = getUserDetail(session?.userId ?? getCurrentUser().id)
      return user.profileId ?? DEFAULT_PROFILE_ID
    }
    const admin = profiles.find((p) => p.isSystem)
    return admin?.id ?? profiles[0]?.id ?? DEFAULT_PROFILE_ID
  }, [authProfile?.id, session?.profileId, session?.userId, profiles])

  const value = useMemo(() => {
    const profile =
      authProfile ??
      findById(profileId) ??
      findById(DEFAULT_PROFILE_ID)
    const map = isPlatformOperator
      ? permissionMap(createFullModulePermissions())
      : getProfilePermissionMap(profile)

    return {
      profileId: profile?.id ?? profileId,
      profileName: isPlatformOperator ? 'Soporte plataforma' : (profile?.name ?? 'Sin perfil'),
      can: (moduleId: MenuModuleId | null, action: PermissionAction) =>
        canModule(map, moduleId, action),
      canAccessPath: (pathname: string) => checkPath(pathname, map),
      filteredNavSections: filterNavSections(navSections, map),
    }
  }, [authProfile, findById, profileId, profiles, isPlatformOperator])

  return (
    <AccessControlContext.Provider value={value}>
      {children}
    </AccessControlContext.Provider>
  )
}
