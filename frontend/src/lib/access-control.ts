import { isSystemAccessProfile } from '@/lib/access-profile-admin'
import { isPublicAppPath } from '@/lib/app-routes'
import type { MenuModuleId, MenuModulePermission, PermissionAction } from '@/lib/menu-modules'
import {
  createFullModulePermissions,
  moduleIdFromNavPath,
  pathToModuleId,
} from '@/lib/menu-modules'
import type { NavSectionDef } from '@/navigation'
import type { AccessProfile } from '@/types/access-profile'

export function permissionMap(
  permissions: MenuModulePermission[],
): Map<MenuModuleId, MenuModulePermission['flags']> {
  return new Map(permissions.map((p) => [p.moduleId, p.flags]))
}

export function canModule(
  map: Map<MenuModuleId, MenuModulePermission['flags']>,
  moduleId: MenuModuleId | null,
  action: PermissionAction,
): boolean {
  if (!moduleId) return true
  const flags = map.get(moduleId)
  if (!flags) return false
  return flags[action]
}

export function filterNavSections(
  sections: NavSectionDef[],
  map: Map<MenuModuleId, MenuModulePermission['flags']>,
): NavSectionDef[] {
  return sections
    .map((section) => {
      const items = (section.type === 'items' ? section.items : section.items).filter(
        (item) => {
          const moduleId = moduleIdFromNavPath(item.path)
          return canModule(map, moduleId, 'menu')
        },
      )
      if (items.length === 0) return null
      if (section.type === 'items') {
        return { type: 'items' as const, items }
      }
      return {
        type: 'group' as const,
        heading: section.heading,
        items,
        defaultOpen: section.defaultOpen,
      }
    })
    .filter((s): s is NavSectionDef => s !== null)
}

export function canAccessPath(
  pathname: string,
  map: Map<MenuModuleId, MenuModulePermission['flags']>,
): boolean {
  if (isPublicAppPath(pathname)) return true
  const moduleId = pathToModuleId(pathname)
  if (!moduleId) return true
  return canModule(map, moduleId, 'menu')
}

export function getProfilePermissionMap(
  profile: AccessProfile | null | undefined,
): Map<MenuModuleId, MenuModulePermission['flags']> {
  if (!profile) return new Map()
  if (isSystemAccessProfile(profile)) {
    return permissionMap(createFullModulePermissions())
  }
  return permissionMap(profile.permissions)
}
