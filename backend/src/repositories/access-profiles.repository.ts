import { tenantQuery, withTenantClient } from '../db/tenant-query.js'
import { tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  canEditProfilePermissions,
  canModifyLockedProfile,
  canRenameProfile,
  isLockedAccessProfile,
} from '../lib/access-profile-admin.js'
import {
  assertPermissionsGrantableByActor,
  filterPermissionsByActorGrant,
  mergePermissionsPreservingHiddenModules,
} from '../lib/profile-permission-grants.js'
import {
  mapAccessProfile,
  mapAccessProfileListRow,
  type AccessProfileRow,
  type PermissionRow,
} from '../mappers/access-profile.mapper.js'
import { forbidden, badRequest, notFound } from '../middleware/errors.js'
import type {
  AccessProfile,
  AccessProfileListItem,
  CreateAccessProfileInput,
  MenuModulePermission,
  UpdateAccessProfileInput,
} from '../types/access-profile.js'
import type { AuditActor } from '../types/audit.js'

/** Usuarios activos del tenant que tienen este perfil (membresía o referencia legacy en crm_users). */
const PROFILE_USER_COUNT_SQL = `
  (SELECT count(DISTINCT u.id)::int
   FROM crm_users u
   INNER JOIN crm_tenant_memberships m
     ON m.user_id = u.id AND m.tenant_id = p.tenant_id
   WHERE u.deleted_at IS NULL
     AND (m.profile_id = p.id OR u.profile_id = p.id)) AS user_count
`

const PROFILE_SELECT = `
  p.id, p.name, p.description, p.is_system, p.system_key, p.updated_at,
  ${PROFILE_USER_COUNT_SQL}
`

async function countUsersAssignedToProfile(
  tenantId: string,
  profileId: string,
): Promise<number> {
  const result = await tenantQuery<{ count: number }>(
    `SELECT count(DISTINCT u.id)::int AS count
     FROM crm_users u
     INNER JOIN crm_tenant_memberships m
       ON m.user_id = u.id AND m.tenant_id = $1
     WHERE u.deleted_at IS NULL
       AND (m.profile_id = $2 OR u.profile_id = $2)`,
    [tenantId, profileId],
  )
  return Number(result.rows[0]?.count ?? 0)
}

function profileInUseMessage(count: number): string {
  if (count === 1) {
    return 'No se puede eliminar el perfil: 1 usuario lo tiene asignado. Reasígnalo antes de eliminar.'
  }
  return `No se puede eliminar el perfil: ${count} usuarios lo tienen asignado. Reasígnalos antes de eliminar.`
}

async function upsertPermissions(
  profileId: string,
  permissions: MenuModulePermission[],
): Promise<void> {
  await withTenantClient(async (client) => {
    await client.query(`DELETE FROM crm_access_profile_permissions WHERE profile_id = $1`, [
      profileId,
    ])
    if (permissions.length === 0) return

    const values: unknown[] = [profileId]
    const placeholders: string[] = []
    permissions.forEach((perm, i) => {
      const base = i * 6 + 2
      placeholders.push(
        `($1, $${base}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`,
      )
      values.push(
        perm.moduleId,
        perm.flags.menu,
        perm.flags.view,
        perm.flags.create,
        perm.flags.edit,
        perm.flags.delete,
      )
    })
    await client.query(
      `INSERT INTO crm_access_profile_permissions (
        profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete
      ) VALUES ${placeholders.join(', ')}`,
      values,
    )
  })
}

function assertCanModifyProfile(existing: AccessProfile, actor: AuditActor): void {
  if (!isLockedAccessProfile(existing)) return
  if (!canModifyLockedProfile(existing, Boolean(actor.isPlatformOperator))) {
    throw forbidden(
      'Los perfiles Administrador e Invitado solo pueden modificarlos operadores de plataforma.',
    )
  }
}

export async function listAccessProfiles(): Promise<AccessProfileListItem[]> {
  const result = await tenantQuery<AccessProfileRow>(
    `SELECT ${PROFILE_SELECT} FROM crm_access_profiles p WHERE ${tenantWhereParam(1, 'p')} ORDER BY p.system_key NULLS LAST, p.name ASC`,
    [getTenantIdOrDefault()],
  )
  return result.rows.map(mapAccessProfileListRow)
}

export async function getAccessProfileById(id: string): Promise<AccessProfile> {
  return withTenantClient(async (client) => {
    const result = await client.query<AccessProfileRow>(
      `SELECT ${PROFILE_SELECT} FROM crm_access_profiles p WHERE p.id = $1 AND ${tenantWhereParam(2, 'p')}`,
      [id, getTenantIdOrDefault()],
    )
    const row = result.rows[0]
    if (!row) throw notFound('Perfil no encontrado')
    const permResult = await client.query<PermissionRow>(
      `SELECT module_id, can_menu, can_view, can_create, can_edit, can_delete
       FROM crm_access_profile_permissions
       WHERE profile_id = $1
       ORDER BY module_id`,
      [id],
    )
    return mapAccessProfile(row, permResult.rows)
  })
}

function permissionsWithActiveGrants(
  permissions: MenuModulePermission[],
): MenuModulePermission[] {
  return permissions.filter((perm) =>
    Object.values(perm.flags).some((flag) => flag),
  )
}

export async function createAccessProfile(
  input: CreateAccessProfileInput,
  actor: AuditActor,
  actorProfile: AccessProfile | undefined,
): Promise<AccessProfile> {
  if (!input.name?.trim()) throw badRequest('El nombre es obligatorio')
  if (!input.permissions?.length) throw badRequest('Los permisos son obligatorios')

  const isPlatformOperator = Boolean(actor.isPlatformOperator)
  assertPermissionsGrantableByActor(input.permissions, actorProfile, isPlatformOperator)
  const permissions = permissionsWithActiveGrants(
    filterPermissionsByActorGrant(input.permissions, actorProfile, isPlatformOperator),
  )
  if (permissions.length === 0) {
    throw badRequest('Indica al menos un permiso que tu perfil pueda otorgar.')
  }

  const result = await tenantQuery<{ id: string }>(
    `INSERT INTO crm_access_profiles (name, description, is_system, updated_at, tenant_id)
     VALUES ($1, $2, false, now(), $3) RETURNING id`,
    [input.name.trim(), input.description?.trim() ?? '', getTenantIdOrDefault()],
  )
  const id = result.rows[0]!.id
  await upsertPermissions(id, permissions)
  return getAccessProfileById(id)
}

export async function updateAccessProfile(
  id: string,
  input: UpdateAccessProfileInput,
  actor: AuditActor,
  actorProfile: AccessProfile | undefined,
): Promise<AccessProfile> {
  const existing = await getAccessProfileById(id)
  assertCanModifyProfile(existing, actor)

  if (input.name !== undefined) {
    if (!canRenameProfile(existing, Boolean(actor.isPlatformOperator))) {
      throw badRequest('No se puede renombrar este perfil de sistema')
    }
    await tenantQuery(
      `UPDATE crm_access_profiles SET name = $2, updated_at = now() WHERE id = $1 AND ${tenantWhereParam(3)}`,
      [id, input.name.trim(), getTenantIdOrDefault()],
    )
  }
  if (input.description !== undefined) {
    await tenantQuery(
      `UPDATE crm_access_profiles SET description = $2, updated_at = now() WHERE id = $1 AND ${tenantWhereParam(3)}`,
      [id, input.description.trim(), getTenantIdOrDefault()],
    )
  }
  if (input.permissions) {
    const isPlatformOperator = Boolean(actor.isPlatformOperator)
    if (!canEditProfilePermissions(existing, isPlatformOperator)) {
      throw badRequest('Los permisos de este perfil no son configurables')
    }
    assertPermissionsGrantableByActor(input.permissions, actorProfile, isPlatformOperator)
    const merged = mergePermissionsPreservingHiddenModules(
      existing.permissions,
      input.permissions,
      actorProfile,
      isPlatformOperator,
    )
    await upsertPermissions(id, permissionsWithActiveGrants(merged))
  }

  return getAccessProfileById(id)
}

export async function deleteAccessProfile(id: string, actor: AuditActor): Promise<void> {
  const profile = await getAccessProfileById(id)
  if (isLockedAccessProfile(profile)) {
    if (!actor.isPlatformOperator) {
      throw forbidden('Los perfiles Administrador e Invitado no pueden eliminarse.')
    }
    throw badRequest('Los perfiles de sistema no pueden eliminarse')
  }

  const tenantId = getTenantIdOrDefault()
  const assigned = await countUsersAssignedToProfile(tenantId, id)
  if (assigned > 0) {
    throw badRequest(profileInUseMessage(assigned))
  }

  await tenantQuery(`DELETE FROM crm_access_profile_permissions WHERE profile_id = $1`, [id])
  const result = await tenantQuery(`DELETE FROM crm_access_profiles WHERE id = $1 AND ${tenantWhereParam(2)}`, [id, getTenantIdOrDefault()])
  if (result.rowCount === 0) throw notFound('Perfil no encontrado')
}
