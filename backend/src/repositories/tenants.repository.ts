import { platformQuery } from '../db/tenant-query.js'
import { badRequest, notFound } from '../middleware/errors.js'
import type {
  TenantKind,
  TenantMembershipOption,
  TenantPublic,
  TenantStatus,
} from '../types/tenant.js'
import { ATRIA_TENANT_ID } from '../types/tenant.js'

export type TenantRow = {
  id: string
  slug: string
  display_name: string
  logo_url: string | null
  status: TenantStatus
  kind: TenantKind
  plan: string | null
  trial_ends_at: Date | string | null
  purge_after_at: Date | string | null
}

function mapTenantPublic(row: TenantRow): TenantPublic {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    logoUrl: row.logo_url?.trim() ?? '',
    status: row.status,
    kind: row.kind,
  }
}

export async function getTenantBySlug(slug: string): Promise<TenantPublic | null> {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return null
  const result = await platformQuery<TenantRow>(
    `SELECT id, slug, display_name, logo_url, status, kind, plan, trial_ends_at, purge_after_at
     FROM crm_tenants
     WHERE lower(slug) = $1 AND status <> 'deleted'
     LIMIT 1`,
    [normalized],
  )
  const row = result.rows[0]
  return row ? mapTenantPublic(row) : null
}

export async function getTenantById(id: string): Promise<TenantPublic | null> {
  const result = await platformQuery<TenantRow>(
    `SELECT id, slug, display_name, logo_url, status, kind, plan, trial_ends_at, purge_after_at
     FROM crm_tenants
     WHERE id = $1 AND status <> 'deleted'
     LIMIT 1`,
    [id],
  )
  const row = result.rows[0]
  return row ? mapTenantPublic(row) : null
}

export function resolveTenantSlugFromHost(
  host: string,
  platformDomain: string,
): string | null {
  const hostname = host.split(':')[0]?.trim().toLowerCase() ?? ''
  const domain = platformDomain.trim().toLowerCase()
  if (!hostname || !domain) return null
  if (hostname === domain || hostname === `www.${domain}`) return null
  if (!hostname.endsWith(`.${domain}`)) return null
  const sub = hostname.slice(0, -(domain.length + 1))
  if (!sub || sub.includes('.')) return null
  return sub
}

export async function listActiveTenants(): Promise<TenantMembershipOption[]> {
  const result = await platformQuery<{
    tenant_id: string
    slug: string
    display_name: string
    logo_url: string | null
  }>(
    `SELECT id AS tenant_id, slug, display_name, logo_url
     FROM crm_tenants
     WHERE status = 'active'
     ORDER BY display_name ASC`,
  )

  return result.rows.map((row, index) => ({
    tenantId: row.tenant_id,
    slug: row.slug,
    displayName: row.display_name,
    logoUrl: row.logo_url?.trim() ?? '',
    isDefault: index === 0,
  }))
}

export async function isPlatformOperator(userId: string): Promise<boolean> {
  const result = await platformQuery<{ is_platform_operator: boolean }>(
    `SELECT COALESCE(is_platform_operator, false) AS is_platform_operator
     FROM crm_users
     WHERE id = $1 AND deleted_at IS NULL`,
    [userId],
  )
  return Boolean(result.rows[0]?.is_platform_operator)
}

export async function listMembershipsForEmail(
  email: string,
): Promise<TenantMembershipOption[]> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return []

  const userResult = await platformQuery<{ is_platform_operator: boolean }>(
    `SELECT COALESCE(is_platform_operator, false) AS is_platform_operator
     FROM crm_users
     WHERE lower(email) = $1 AND deleted_at IS NULL`,
    [normalized],
  )
  if (userResult.rows[0]?.is_platform_operator) {
    return listActiveTenants()
  }

  const result = await platformQuery<{
    tenant_id: string
    slug: string
    display_name: string
    logo_url: string | null
    is_default: boolean
  }>(
    `SELECT t.id AS tenant_id, t.slug, t.display_name, t.logo_url, m.is_default
     FROM crm_users u
     JOIN crm_tenant_memberships m ON m.user_id = u.id
     JOIN crm_tenants t ON t.id = m.tenant_id
     WHERE lower(u.email) = $1
       AND u.deleted_at IS NULL
       AND m.status = 'active'
       AND t.status = 'active'
     ORDER BY m.is_default DESC, t.display_name ASC`,
    [normalized],
  )

  return result.rows.map((row) => ({
    tenantId: row.tenant_id,
    slug: row.slug,
    displayName: row.display_name,
    logoUrl: row.logo_url?.trim() ?? '',
    isDefault: row.is_default,
  }))
}

export async function assertUserMembership(
  userId: string,
  tenantId: string,
): Promise<{ profileId: string }> {
  const result = await platformQuery<{ profile_id: string }>(
    `SELECT m.profile_id
     FROM crm_tenant_memberships m
     JOIN crm_tenants t ON t.id = m.tenant_id
     WHERE m.user_id = $1
       AND m.tenant_id = $2
       AND m.status = 'active'
       AND t.status = 'active'
     LIMIT 1`,
    [userId, tenantId],
  )
  const row = result.rows[0]
  if (!row) throw badRequest('No tienes acceso a esta empresa.')
  return { profileId: row.profile_id }
}

async function assertTenantActive(tenantId: string): Promise<void> {
  const result = await platformQuery<{ status: TenantStatus }>(
    `SELECT status FROM crm_tenants WHERE id = $1 AND status <> 'deleted'`,
    [tenantId],
  )
  if (result.rows[0]?.status !== 'active') {
    throw badRequest('Empresa no disponible.')
  }
}

async function getSystemProfileIdForTenant(tenantId: string): Promise<string> {
  const system = await platformQuery<{ id: string }>(
    `SELECT id FROM crm_access_profiles
     WHERE tenant_id = $1 AND is_system = true
     LIMIT 1`,
    [tenantId],
  )
  if (system.rows[0]?.id) return system.rows[0].id

  const namedAdmin = await platformQuery<{ id: string }>(
    `SELECT id FROM crm_access_profiles
     WHERE tenant_id = $1 AND lower(name) = 'administrador'
     ORDER BY is_system DESC, updated_at ASC
     LIMIT 1`,
    [tenantId],
  )
  if (namedAdmin.rows[0]?.id) return namedAdmin.rows[0].id

  const anyProfile = await platformQuery<{ id: string }>(
    `SELECT id FROM crm_access_profiles
     WHERE tenant_id = $1
     ORDER BY is_system DESC, updated_at ASC
     LIMIT 1`,
    [tenantId],
  )
  const id = anyProfile.rows[0]?.id
  if (!id) {
    throw badRequest('Esta empresa no tiene perfiles de acceso configurados.')
  }
  return id
}

/** Garantiza membresía activa del operador en el tenant (perfil Administrador del sistema). */
export async function ensurePlatformOperatorMembership(
  userId: string,
  tenantId: string,
): Promise<{ profileId: string }> {
  const profileId = await getSystemProfileIdForTenant(tenantId)
  await platformQuery(
    `INSERT INTO crm_tenant_memberships (tenant_id, user_id, profile_id, status, is_default)
     VALUES ($1, $2, $3, 'active', false)
     ON CONFLICT (tenant_id, user_id) DO UPDATE
       SET status = 'active'::crm_membership_status,
           profile_id = EXCLUDED.profile_id`,
    [tenantId, userId, profileId],
  )
  return { profileId }
}

/** Añade o reactiva a todos los operadores de plataforma en un tenant recién creado. */
export async function ensureAllPlatformOperatorsInTenant(tenantId: string): Promise<void> {
  const operators = await platformQuery<{ id: string }>(
    `SELECT id FROM crm_users
     WHERE is_platform_operator = true AND deleted_at IS NULL`,
  )
  for (const row of operators.rows) {
    await ensurePlatformOperatorMembership(row.id, tenantId)
  }
}

export type TenantAccessResult = {
  profileId: string
  isPlatformOperator: boolean
}

/** Membresía normal o acceso de operador de plataforma al tenant activo. */
export async function resolveTenantAccess(
  userId: string,
  tenantId: string,
): Promise<TenantAccessResult> {
  const trimmed = tenantId.trim()
  if (!trimmed) throw badRequest('Empresa requerida.')

  if (await isPlatformOperator(userId)) {
    await assertTenantActive(trimmed)
    const { profileId } = await ensurePlatformOperatorMembership(userId, trimmed)
    return { profileId, isPlatformOperator: true }
  }

  const membership = await assertUserMembership(userId, trimmed)
  return { profileId: membership.profileId, isPlatformOperator: false }
}

export async function getDefaultTenantIdForUser(userId: string): Promise<string> {
  if (await isPlatformOperator(userId)) {
    const tenants = await listActiveTenants()
    const first = tenants[0]
    if (!first) throw notFound('Sin empresas activas')
    return first.tenantId
  }

  const result = await platformQuery<{ tenant_id: string }>(
    `SELECT tenant_id FROM crm_tenant_memberships
     WHERE user_id = $1 AND status = 'active'
     ORDER BY is_default DESC, created_at ASC
     LIMIT 1`,
    [userId],
  )
  const id = result.rows[0]?.tenant_id
  if (!id) throw notFound('Sin empresa asignada')
  return id
}

export { ATRIA_TENANT_ID }

const RESERVED_TENANT_SLUGS = new Set([
  'atriasolutions',
  'atria',
  'www',
  'api',
  'admin',
  'app',
  'mail',
  'smtp',
  'cdn',
  'static',
])

export function normalizeTenantSlug(raw: string): string {
  return (
    raw
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 56) || ''
  )
}

export function assertTenantSlugAvailable(slug: string): void {
  if (!slug) throw badRequest('El identificador (slug) es inválido.')
  if (RESERVED_TENANT_SLUGS.has(slug)) {
    throw badRequest(`El identificador «${slug}» está reservado.`)
  }
}

export type CreateBlankTenantInput = {
  slug: string
  displayName: string
}

/** Instancia vacía de producción (sin datos demo ni usuario inicial). */
export async function createBlankTenant(
  input: CreateBlankTenantInput,
): Promise<{ tenantId: string; slug: string }> {
  const slug = normalizeTenantSlug(input.slug || input.displayName)
  assertTenantSlugAvailable(slug)
  if (!input.displayName.trim()) throw badRequest('El nombre de la instancia es obligatorio.')

  const existing = await getTenantBySlug(slug)
  if (existing) throw badRequest('Ya existe una instancia con ese identificador.')

  const result = await platformQuery<{ id: string }>(
    `INSERT INTO crm_tenants (id, slug, display_name, status, kind, plan)
     VALUES (gen_random_uuid(), $1, $2, 'provisioning', 'production', 'production')
     RETURNING id`,
    [slug, input.displayName.trim()],
  )
  const tenantId = result.rows[0]?.id
  if (!tenantId) throw badRequest('No se pudo crear la instancia.')
  return { tenantId, slug }
}

export type CreateTrialTenantInput = {
  slug: string
  displayName: string
  adminEmail: string
  adminName: string
  trialDays?: number
}

export async function createTrialTenant(
  input: CreateTrialTenantInput,
): Promise<{ tenantId: string; slug: string }> {
  const slug = normalizeTenantSlug(input.slug)
  assertTenantSlugAvailable(slug)
  if (!slug) throw badRequest('Slug de tenant inválido')

  const existing = await getTenantBySlug(slug)
  if (existing) throw badRequest('El identificador de demo ya existe.')

  const trialDays = input.trialDays ?? 14
  const result = await platformQuery<{ id: string }>(
    `INSERT INTO crm_tenants (id, slug, display_name, status, kind, plan, trial_ends_at, purge_after_at)
     VALUES (
       gen_random_uuid(), $1, $2, 'provisioning', 'trial', 'trial',
       now() + make_interval(days => $3),
       now() + make_interval(days => $3 + 7)
     )
     RETURNING id`,
    [slug, input.displayName.trim(), trialDays],
  )
  const tenantId = result.rows[0]?.id
  if (!tenantId) throw badRequest('No se pudo crear el tenant de prueba')
  return { tenantId, slug }
}

export async function listTenantsDueForPurge(): Promise<TenantRow[]> {
  const result = await platformQuery<TenantRow>(
    `SELECT id, slug, display_name, logo_url, status, kind, plan, trial_ends_at, purge_after_at
     FROM crm_tenants
     WHERE kind = 'trial'
       AND purge_after_at IS NOT NULL
       AND purge_after_at < now()
       AND status <> 'deleted'`,
  )
  return result.rows
}

export async function markTenantDeleted(tenantId: string): Promise<void> {
  await platformQuery(
    `UPDATE crm_tenants SET status = 'deleted', updated_at = now() WHERE id = $1`,
    [tenantId],
  )
}
