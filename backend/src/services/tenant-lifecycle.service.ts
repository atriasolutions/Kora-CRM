import { randomBytes } from 'node:crypto'

import { platformQuery, tenantQuery } from '../db/tenant-query.js'
import { trialProvisionedEmail } from '../emails/trial-provisioned.js'
import { findUserByEmail } from '../lib/user-email-uniqueness.js'
import { runWithTenantAsync } from '../lib/tenant-context.js'
import { createEntityNote } from '../repositories/entity-notes.repository.js'
import { createUser } from '../repositories/users.repository.js'
import {
  createBlankTenant,
  createTrialTenant,
  ensureAllPlatformOperatorsInTenant,
  getTenantBySlug,
  listTenantsDueForPurge,
  markTenantDeleted,
} from '../repositories/tenants.repository.js'
import { insertDefaultTrialQuotas } from '../repositories/tenant-quotas.repository.js'
import { seedDefaultProductCategories } from '../repositories/product-categories.repository.js'
import { insertDefaultTenantProfiles } from './default-tenant-profiles.service.js'
import { purgeTenantLikeExpiredTrial } from './tenant-purge.service.js'
import { ATRIA_TENANT_ID } from '../types/tenant.js'
import { badRequest } from '../middleware/errors.js'
import type { CreateTrialTenantInput } from '../repositories/tenants.repository.js'
import type { AuditActor } from '../types/audit.js'
import { env } from '../config/env.js'
import { sendMail } from './mail.service.js'
import { sendAccountSetupInvite } from './user-onboarding.service.js'

const TRIAL_PROFILE_NAME = 'Administrador'
const SYSTEM_ACTOR: AuditActor = {
  userId: env.demoUserId,
  userName: 'Kora CRM',
  tenantId: ATRIA_TENANT_ID,
}

export type TrialProvisionResult = {
  provisioned: boolean
  tenantId?: string
  slug?: string
  loginUrl?: string
  trialDays?: number
  welcomeEmailed?: boolean
  setupInviteSent?: boolean
  error?: string
}

function slugifyCompanyName(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'demo'
  )
}

export function buildTenantLoginUrl(slug: string): string {
  return `https://${slug}.${env.platformDomain}/login`
}

export type BlankTenantProvisionResult = {
  tenantId: string
  slug: string
  displayName: string
  loginUrl: string
}

/** Instancia vacía: perfiles, bodega y configuración base; sin usuarios ni datos CRM. */
export async function provisionBlankTenant(input: {
  displayName: string
  slug?: string
}): Promise<BlankTenantProvisionResult> {
  const displayName = input.displayName.trim()
  if (!displayName) throw badRequest('El nombre de la instancia es obligatorio.')

  const { tenantId, slug } = await createBlankTenant({
    displayName,
    slug: input.slug?.trim() ?? displayName,
  })

  try {
    await runWithTenantAsync({ tenantId, tenantSlug: slug }, async () => {
      const { adminProfileId: profileId } = await insertDefaultTenantProfiles(tenantId, slug)
      if (!profileId) throw badRequest('No se pudo crear el perfil administrador.')

      await tenantQuery(
        `INSERT INTO crm_organization_settings (tenant_id, legal_name, trade_name)
         VALUES ($1, $2, $2)`,
        [tenantId, displayName],
      )

      await tenantQuery(
        `INSERT INTO crm_warehouses (tenant_id, name, code, is_default, active)
         VALUES ($1, 'Bodega principal', 'MAIN', true, true)`,
        [tenantId],
      )

      await seedDefaultProductCategories(tenantId)
    })

    await platformQuery(
      `UPDATE crm_tenants SET status = 'active', updated_at = now() WHERE id = $1`,
      [tenantId],
    )

    await ensureAllPlatformOperatorsInTenant(tenantId)

    const loginUrl = buildTenantLoginUrl(slug)
    return { tenantId, slug, displayName, loginUrl }
  } catch (err) {
    await markTenantDeleted(tenantId).catch((cleanupErr) => {
      console.error('[blank-tenant] No se pudo limpiar instancia fallida:', cleanupErr)
    })
    throw err
  }
}

export type ActiveTrialForEmail = {
  tenantId: string
  slug: string
  loginUrl: string
  trialEndsAt: Date | null
}

/** Demo trial vigente asociada al correo del solicitante (máx. una instancia activa). */
export async function findActiveTrialForEmail(
  email: string,
): Promise<ActiveTrialForEmail | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null

  const result = await platformQuery<{
    tenant_id: string
    slug: string
    trial_ends_at: Date | string | null
  }>(
    `SELECT t.id AS tenant_id, t.slug, t.trial_ends_at
     FROM crm_tenants t
     INNER JOIN crm_tenant_memberships m ON m.tenant_id = t.id
     INNER JOIN crm_users u ON u.id = m.user_id
     WHERE lower(trim(u.email)) = $1
       AND u.deleted_at IS NULL
       AND m.status IN ('active', 'invited')
       AND t.kind = 'trial'
       AND t.status IN ('active', 'provisioning')
       AND (t.trial_ends_at IS NULL OR t.trial_ends_at > now())
     ORDER BY t.created_at DESC
     LIMIT 1`,
    [normalized],
  )

  const row = result.rows[0]
  if (!row) return null

  return {
    tenantId: row.tenant_id,
    slug: row.slug,
    loginUrl: buildTenantLoginUrl(row.slug),
    trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : null,
  }
}

export async function generateUniqueTrialSlug(company: string): Promise<string> {
  const base = slugifyCompanyName(company)
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix =
      attempt === 0 ? '' : `-${randomBytes(2).toString('hex')}`
    const slug = `${base}${suffix}`.replace(/-+/g, '-').slice(0, 56)
    if (!(await getTenantBySlug(slug))) return slug
  }
  return `${base}-${Date.now().toString(36).slice(-6)}`.slice(0, 56)
}

export async function provisionTrialTenant(
  input: CreateTrialTenantInput,
): Promise<{ tenantId: string; slug: string; loginUrl: string }> {
  const { tenantId, slug } = await createTrialTenant(input)

  try {
    await runWithTenantAsync({ tenantId, tenantSlug: slug }, async () => {
      const { adminProfileId: profileId } = await insertDefaultTenantProfiles(tenantId, slug)
      if (!profileId) throw badRequest('No se pudo crear el perfil demo')

      await tenantQuery(
        `INSERT INTO crm_organization_settings (tenant_id, legal_name, trade_name, email)
         VALUES ($1, $2, $2, $3)`,
        [tenantId, input.displayName.trim(), input.adminEmail.trim()],
      )

      await tenantQuery(
        `INSERT INTO crm_warehouses (tenant_id, name, code, is_default, active)
         VALUES ($1, 'Bodega principal', 'MAIN', true, true)`,
        [tenantId],
      )

      await seedDefaultProductCategories(tenantId)
    })

    await insertDefaultTrialQuotas(tenantId)

    await platformQuery(
      `UPDATE crm_tenants SET status = 'active', updated_at = now() WHERE id = $1`,
      [tenantId],
    )

    await ensureAllPlatformOperatorsInTenant(tenantId)

    const loginUrl = buildTenantLoginUrl(slug)
    return { tenantId, slug, loginUrl }
  } catch (err) {
    await markTenantDeleted(tenantId).catch((cleanupErr) => {
      console.error('[trial-provision] No se pudo limpiar tenant fallido:', cleanupErr)
    })
    throw err
  }
}

async function getTrialAdminProfileId(
  tenantId: string,
  tenantSlug: string,
): Promise<string> {
  return runWithTenantAsync({ tenantId, tenantSlug }, async () => {
    const result = await tenantQuery<{ id: string }>(
      `SELECT id FROM crm_access_profiles
       WHERE tenant_id = $1 AND name = $2
       LIMIT 1`,
      [tenantId, TRIAL_PROFILE_NAME],
    )
    const profileId = result.rows[0]?.id
    if (!profileId) throw badRequest('Perfil administrador demo no encontrado')
    return profileId
  })
}

async function ensureTrialAdminUser(params: {
  tenantId: string
  tenantSlug: string
  profileId: string
  name: string
  email: string
  phone?: string
}): Promise<{ userId: string; needsActivation: boolean; setupInviteSent: boolean }> {
  const normalizedEmail = params.email.trim().toLowerCase()
  const existing = await findUserByEmail(normalizedEmail)

  if (existing) {
    const statusResult = await platformQuery<{ status: string }>(
      `SELECT status FROM crm_users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [existing.id],
    )
    const status = statusResult.rows[0]?.status ?? 'Por verificar'
    const membershipStatus = status === 'Activo' ? 'active' : 'invited'

    await platformQuery(
      `INSERT INTO crm_tenant_memberships (tenant_id, user_id, profile_id, status, is_default)
       VALUES ($1, $2, $3, $4::crm_membership_status, false)
       ON CONFLICT (tenant_id, user_id) DO UPDATE
         SET profile_id = EXCLUDED.profile_id,
             status = EXCLUDED.status`,
      [params.tenantId, existing.id, params.profileId, membershipStatus],
    )

    let setupInviteSent = false
    const needsActivation = status === 'Por verificar' || status === 'Invitado'
    if (needsActivation) {
      const invite = await sendAccountSetupInvite(existing.id)
      setupInviteSent = invite.emailed
    }

    return { userId: existing.id, needsActivation, setupInviteSent }
  }

  return runWithTenantAsync(
    { tenantId: params.tenantId, tenantSlug: params.tenantSlug },
    async () => {
      const actor: AuditActor = {
        ...SYSTEM_ACTOR,
        tenantId: params.tenantId,
      }
      const user = await createUser(
        {
          name: params.name.trim(),
          email: normalizedEmail,
          profileId: params.profileId,
          role: 'Administrador',
          phone: params.phone?.trim(),
          sendInvite: true,
        },
        actor,
      )

      await platformQuery(
        `INSERT INTO crm_tenant_memberships (tenant_id, user_id, profile_id, status, is_default)
         VALUES ($1, $2, $3, 'invited', true)
         ON CONFLICT (tenant_id, user_id) DO NOTHING`,
        [params.tenantId, user.id, params.profileId],
      )

      return {
        userId: user.id,
        needsActivation: true,
        setupInviteSent: true,
      }
    },
  )
}

export async function appendTrialProvisionNote(params: {
  contactId: string
  companyName: string
  slug: string
  loginUrl: string
  trialDays: number
}): Promise<void> {
  await runWithTenantAsync(
    { tenantId: ATRIA_TENANT_ID, tenantSlug: 'atriasolutions' },
    async () => {
      await createEntityNote(
        {
          entityType: 'contacto',
          entityId: params.contactId,
          body: [
            'Demo automática provisionada',
            `Empresa demo: ${params.companyName}`,
            `URL: ${params.loginUrl}`,
            `Slug: ${params.slug}`,
            `Vigencia: ${params.trialDays} días`,
          ].join('\n'),
          mentions: [],
        },
        SYSTEM_ACTOR,
      )
    },
  )
}

/** Crea tenant trial, usuario admin y envía correo al solicitante. */
export async function provisionTrialFromLead(input: {
  name: string
  company: string
  email: string
  phone?: string
  contactId?: string
}): Promise<TrialProvisionResult> {
  const trialDays = Number.isFinite(env.marketingTrialDays) && env.marketingTrialDays > 0
    ? env.marketingTrialDays
    : 14

  const existingTrial = await findActiveTrialForEmail(input.email)
  if (existingTrial) {
    return {
      provisioned: false,
      slug: existingTrial.slug,
      loginUrl: existingTrial.loginUrl,
      trialDays,
      error: 'Ya existe una demo activa para este correo.',
    }
  }

  try {
    const slug = await generateUniqueTrialSlug(input.company)
    const { tenantId, loginUrl } = await provisionTrialTenant({
      slug,
      displayName: input.company.trim(),
      adminEmail: input.email.trim(),
      adminName: input.name.trim(),
      trialDays,
    })

    const profileId = await getTrialAdminProfileId(tenantId, slug)
    const admin = await ensureTrialAdminUser({
      tenantId,
      tenantSlug: slug,
      profileId,
      name: input.name,
      email: input.email,
      phone: input.phone,
    })

    const mail = trialProvisionedEmail({
      userName: input.name.trim(),
      companyName: input.company.trim(),
      loginUrl,
      trialDays,
      needsActivation: admin.needsActivation,
    })

    const welcomeEmailed = await sendMail({
      to: input.email.trim(),
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      category: mail.category,
    })

    if (input.contactId) {
      await appendTrialProvisionNote({
        contactId: input.contactId,
        companyName: input.company.trim(),
        slug,
        loginUrl,
        trialDays,
      }).catch((err) => {
        console.error('[trial-provision] No se pudo agregar nota al contacto:', err)
      })
    }

    return {
      provisioned: true,
      tenantId,
      slug,
      loginUrl,
      trialDays,
      welcomeEmailed,
      setupInviteSent: admin.setupInviteSent,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[trial-provision] Falló aprovisionamiento demo:', err)
    return { provisioned: false, error: message }
  }
}

/** @deprecated Usar provisionTrialFromLead */
export async function enqueueTrialFromLead(input: {
  name: string
  company: string
  email: string
}): Promise<void> {
  await provisionTrialFromLead(input)
}

/** Purga tenants trial vencidos (orden topológico simplificado). */
export async function purgeExpiredTrialTenants(): Promise<number> {
  const due = await listTenantsDueForPurge()
  let count = 0

  for (const tenant of due) {
    if (tenant.id === ATRIA_TENANT_ID) continue
    await purgeTenantLikeExpiredTrial(tenant.id)
    count++
  }

  return count
}
