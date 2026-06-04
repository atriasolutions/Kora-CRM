import { pool } from '../db/pool.js'
import {
  mapAccessProfile,
  mapAccessProfileListRow,
  type AccessProfileRow,
  type PermissionRow,
} from '../mappers/access-profile.mapper.js'
import { isSystemAccessProfile } from '../lib/access-profile-admin.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type {
  AccessProfile,
  AccessProfileListItem,
  CreateAccessProfileInput,
  MenuModulePermission,
  UpdateAccessProfileInput,
} from '../types/access-profile.js'

const PROFILE_SELECT = `
  p.id, p.name, p.description, p.is_system, p.updated_at,
  (SELECT count(*)::int FROM crm_users u WHERE u.profile_id = p.id AND u.deleted_at IS NULL) AS user_count
`

async function loadPermissions(profileId: string): Promise<PermissionRow[]> {
  const result = await pool.query<PermissionRow>(
    `SELECT module_id, can_menu, can_view, can_create, can_edit, can_delete
     FROM crm_access_profile_permissions
     WHERE profile_id = $1
     ORDER BY module_id`,
    [profileId],
  )
  return result.rows
}

async function upsertPermissions(
  profileId: string,
  permissions: MenuModulePermission[],
): Promise<void> {
  await pool.query(`DELETE FROM crm_access_profile_permissions WHERE profile_id = $1`, [
    profileId,
  ])
  for (const perm of permissions) {
    await pool.query(
      `INSERT INTO crm_access_profile_permissions (
        profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        profileId,
        perm.moduleId,
        perm.flags.menu,
        perm.flags.view,
        perm.flags.create,
        perm.flags.edit,
        perm.flags.delete,
      ],
    )
  }
}

export async function listAccessProfiles(): Promise<AccessProfileListItem[]> {
  const result = await pool.query<AccessProfileRow>(
    `SELECT ${PROFILE_SELECT} FROM crm_access_profiles p ORDER BY p.name ASC`,
  )
  return result.rows.map(mapAccessProfileListRow)
}

export async function getAccessProfileById(id: string): Promise<AccessProfile> {
  const result = await pool.query<AccessProfileRow>(
    `SELECT ${PROFILE_SELECT} FROM crm_access_profiles p WHERE p.id = $1`,
    [id],
  )
  const row = result.rows[0]
  if (!row) throw notFound('Perfil no encontrado')
  const permissions = await loadPermissions(id)
  return mapAccessProfile(row, permissions)
}

export async function createAccessProfile(
  input: CreateAccessProfileInput,
): Promise<AccessProfile> {
  if (!input.name?.trim()) throw badRequest('El nombre es obligatorio')
  if (!input.permissions?.length) throw badRequest('Los permisos son obligatorios')

  const result = await pool.query<{ id: string }>(
    `INSERT INTO crm_access_profiles (name, description, is_system, updated_at)
     VALUES ($1, $2, false, now()) RETURNING id`,
    [input.name.trim(), input.description?.trim() ?? ''],
  )
  const id = result.rows[0]!.id
  await upsertPermissions(id, input.permissions)
  return getAccessProfileById(id)
}

export async function updateAccessProfile(
  id: string,
  input: UpdateAccessProfileInput,
): Promise<AccessProfile> {
  const existing = await getAccessProfileById(id)

  if (existing.isSystem && input.name && input.name.trim() !== existing.name) {
    throw badRequest('No se puede renombrar un perfil de sistema')
  }

  if (input.name !== undefined) {
    await pool.query(
      `UPDATE crm_access_profiles SET name = $2, updated_at = now() WHERE id = $1`,
      [id, input.name.trim()],
    )
  }
  if (input.description !== undefined) {
    await pool.query(
      `UPDATE crm_access_profiles SET description = $2, updated_at = now() WHERE id = $1`,
      [id, input.description.trim()],
    )
  }
  if (input.permissions) {
    if (isSystemAccessProfile(existing)) {
      throw badRequest('Los permisos del perfil Administrador no son configurables')
    }
    await upsertPermissions(id, input.permissions)
  }

  return getAccessProfileById(id)
}

export async function deleteAccessProfile(id: string): Promise<void> {
  const profile = await getAccessProfileById(id)
  if (profile.isSystem) throw badRequest('No se puede eliminar un perfil de sistema')
  if (profile.userCount > 0) {
    throw badRequest('No se puede eliminar un perfil con usuarios asignados')
  }
  await pool.query(`DELETE FROM crm_access_profile_permissions WHERE profile_id = $1`, [id])
  const result = await pool.query(`DELETE FROM crm_access_profiles WHERE id = $1`, [id])
  if (result.rowCount === 0) throw notFound('Perfil no encontrado')
}
