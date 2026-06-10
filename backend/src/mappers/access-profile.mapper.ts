import type {
  AccessProfile,
  AccessProfileListItem,
  MenuModulePermission,
} from '../types/access-profile.js'
import { formatDateLabel } from '../utils/format.js'
import { MODULE_LABELS } from './user.mapper.js'

export type AccessProfileRow = {
  id: string
  name: string
  description: string
  is_system: boolean
  system_key: 'admin' | 'guest' | null
  updated_at: Date
  user_count: string | number
}

export type PermissionRow = {
  module_id: string
  can_menu: boolean
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

export function mapPermissionRow(row: PermissionRow): MenuModulePermission {
  return {
    moduleId: row.module_id,
    label: MODULE_LABELS[row.module_id] ?? row.module_id,
    flags: {
      menu: row.can_menu,
      view: row.can_view,
      create: row.can_create,
      edit: row.can_edit,
      delete: row.can_delete,
    },
  }
}

export function mapAccessProfileListRow(row: AccessProfileRow): AccessProfileListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    userCount: Number(row.user_count ?? 0),
    updatedAt: formatDateLabel(row.updated_at),
    isSystem: row.is_system,
    systemKey: row.system_key ?? undefined,
  }
}

export function mapAccessProfile(
  row: AccessProfileRow,
  permissions: PermissionRow[],
): AccessProfile {
  return {
    ...mapAccessProfileListRow(row),
    permissions: permissions.map(mapPermissionRow),
  }
}
