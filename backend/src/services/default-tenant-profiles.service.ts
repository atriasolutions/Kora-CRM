import { platformQuery } from '../db/tenant-query.js'
import {
  ADMIN_PROFILE_NAME,
  ALL_MENU_MODULE_IDS,
  createGuestProfilePermissions,
  GUEST_PROFILE_NAME,
} from '../lib/default-tenant-profiles.js'
import { runWithTenantAsync } from '../lib/tenant-context.js'
import type { MenuModulePermission } from '../types/access-profile.js'

async function upsertProfilePermissions(
  profileId: string,
  permissions: MenuModulePermission[],
): Promise<void> {
  for (const perm of permissions) {
    await platformQuery(
      `INSERT INTO crm_access_profile_permissions (
         profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (profile_id, module_id) DO UPDATE SET
         can_menu = EXCLUDED.can_menu,
         can_view = EXCLUDED.can_view,
         can_create = EXCLUDED.can_create,
         can_edit = EXCLUDED.can_edit,
         can_delete = EXCLUDED.can_delete`,
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

async function ensureAdminProfile(tenantId: string): Promise<string> {
  const existing = await platformQuery<{ id: string }>(
    `SELECT id FROM crm_access_profiles
     WHERE tenant_id = $1 AND system_key = 'admin'
     LIMIT 1`,
    [tenantId],
  )
  if (existing.rows[0]?.id) return existing.rows[0].id

  const legacy = await platformQuery<{ id: string }>(
    `SELECT id FROM crm_access_profiles
     WHERE tenant_id = $1 AND is_system = true
     LIMIT 1`,
    [tenantId],
  )
  if (legacy.rows[0]?.id) {
    await platformQuery(
      `UPDATE crm_access_profiles
       SET system_key = 'admin', name = $2, updated_at = now()
       WHERE id = $1`,
      [legacy.rows[0].id, ADMIN_PROFILE_NAME],
    )
    return legacy.rows[0].id
  }

  const inserted = await platformQuery<{ id: string }>(
    `INSERT INTO crm_access_profiles (
       tenant_id, name, description, is_system, system_key, updated_at
     ) VALUES ($1, $2, 'Acceso total a todos los módulos del CRM.', true, 'admin', now())
     RETURNING id`,
    [tenantId, ADMIN_PROFILE_NAME],
  )
  const adminId = inserted.rows[0]!.id

  for (const moduleId of ALL_MENU_MODULE_IDS) {
    await platformQuery(
      `INSERT INTO crm_access_profile_permissions (
         profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete
       ) VALUES ($1, $2, true, true, true, true, true)
       ON CONFLICT (profile_id, module_id) DO NOTHING`,
      [adminId, moduleId],
    )
  }

  return adminId
}

async function ensureGuestProfile(tenantId: string): Promise<string> {
  const existing = await platformQuery<{ id: string }>(
    `SELECT id FROM crm_access_profiles
     WHERE tenant_id = $1 AND system_key = 'guest'
     LIMIT 1`,
    [tenantId],
  )
  if (existing.rows[0]?.id) {
    await upsertProfilePermissions(existing.rows[0].id, createGuestProfilePermissions())
    return existing.rows[0].id
  }

  const inserted = await platformQuery<{ id: string }>(
    `INSERT INTO crm_access_profiles (
       tenant_id, name, description, is_system, system_key, updated_at
     ) VALUES (
       $1, $2,
       'Acceso limitado a proyectos y bitácora (solo lectura por empresa) y solicitudes.',
       false, 'guest', now()
     )
     RETURNING id`,
    [tenantId, GUEST_PROFILE_NAME],
  )
  const guestId = inserted.rows[0]!.id
  await upsertProfilePermissions(guestId, createGuestProfilePermissions())
  return guestId
}

/** Crea o normaliza Administrador e Invitado para una instancia. */
export async function insertDefaultTenantProfiles(
  tenantId: string,
  tenantSlug?: string,
): Promise<{ adminProfileId: string; guestProfileId: string }> {
  if (tenantSlug) {
    return runWithTenantAsync({ tenantId, tenantSlug }, async () => {
      const adminProfileId = await ensureAdminProfile(tenantId)
      const guestProfileId = await ensureGuestProfile(tenantId)
      return { adminProfileId, guestProfileId }
    })
  }

  const adminProfileId = await ensureAdminProfile(tenantId)
  const guestProfileId = await ensureGuestProfile(tenantId)
  return { adminProfileId, guestProfileId }
}

export async function getGuestProfileId(tenantId: string): Promise<string | null> {
  const result = await platformQuery<{ id: string }>(
    `SELECT id FROM crm_access_profiles
     WHERE tenant_id = $1 AND system_key = 'guest'
     LIMIT 1`,
    [tenantId],
  )
  return result.rows[0]?.id ?? null
}

export async function getProfileSystemKey(profileId: string): Promise<string | null> {
  const result = await platformQuery<{ system_key: string | null }>(
    `SELECT system_key FROM crm_access_profiles WHERE id = $1 LIMIT 1`,
    [profileId],
  )
  return result.rows[0]?.system_key ?? null
}

export async function isGuestProfileId(profileId: string, tenantId: string): Promise<boolean> {
  const result = await platformQuery<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM crm_access_profiles
       WHERE id = $1 AND tenant_id = $2 AND system_key = 'guest'
     ) AS ok`,
    [profileId, tenantId],
  )
  return Boolean(result.rows[0]?.ok)
}
