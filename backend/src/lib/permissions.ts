import type { AccessProfile, MenuModulePermission } from '../types/access-profile.js'
import { isSystemAccessProfile } from './access-profile-admin.js'
import type { MenuModuleId, PermissionAction } from './menu-modules.js'

export function permissionMap(
  permissions: MenuModulePermission[],
): Map<string, MenuModulePermission['flags']> {
  return new Map(permissions.map((p) => [p.moduleId, p.flags]))
}

export function canModulePermission(
  profile: AccessProfile | null | undefined,
  moduleId: MenuModuleId,
  action: PermissionAction,
): boolean {
  if (!profile) return false
  if (isSystemAccessProfile(profile)) return true
  const flags = permissionMap(profile.permissions).get(moduleId)
  if (!flags) return false
  return Boolean(flags[action])
}
