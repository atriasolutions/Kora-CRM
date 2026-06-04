import { createContext } from 'react'

import type { MenuModuleId, PermissionAction } from '@/lib/menu-modules'
import type { NavSectionDef } from '@/navigation'

export type AccessControlValue = {
  profileId: string
  profileName: string
  can: (moduleId: MenuModuleId | null, action: PermissionAction) => boolean
  canAccessPath: (pathname: string) => boolean
  filteredNavSections: NavSectionDef[]
}

export const AccessControlContext = createContext<AccessControlValue | null>(null)
