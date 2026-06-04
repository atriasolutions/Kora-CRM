import { useMemo } from 'react'

import { useMenuAccess } from '@/hooks/use-menu-access'
import type { MenuModuleId } from '@/lib/menu-modules'

/** Permisos CRUD del módulo según el perfil del usuario. */
export function useModulePermissions(moduleId: MenuModuleId) {
  const { can } = useMenuAccess()
  return useMemo(
    () => ({
      canView: can(moduleId, 'view'),
      canCreate: can(moduleId, 'create'),
      canEdit: can(moduleId, 'edit'),
      canDelete: can(moduleId, 'delete'),
    }),
    [can, moduleId],
  )
}
