import { randomBytes } from 'node:crypto'

import { platformQuery, tenantQuery } from '../db/tenant-query.js'
import { trialProvisionedEmail } from '../emails/trial-provisioned.js'
import { findUserByEmail } from '../lib/user-email-uniqueness.js'
import { runWithTenantAsync } from '../lib/tenant-context.js'
import { createEntityNote } from '../repositories/entity-notes.repository.js'
import { createUser } from '../repositories/users.repository.js'
import {
  createTrialTenant,
  getTenantBySlug,
  listTenantsDueForPurge,
  markTenantDeleted,
} from '../repositories/tenants.repository.js'
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
      const profileResult = await tenantQuery<{ id: string }>(
        `INSERT INTO crm_access_profiles (name, description, is_system, updated_at, tenant_id)
         VALUES ($1, 'Acceso total al tenant de prueba', true, now(), $2)
         RETURNING id`,
        [TRIAL_PROFILE_NAME, tenantId],
      )
      const profileId = profileResult.rows[0]?.id
      if (!profileId) throw badRequest('No se pudo crear el perfil demo')

      const modules = [
        'dashboard', 'contactos', 'empresas', 'oportunidades', 'cotizaciones',
        'facturacion', 'actividades', 'proyectos', 'solicitudes', 'compras', 'ingresos',
        'inventario', 'productos', 'reportes', 'usuarios', 'perfiles', 'configuracion',
      ]
      for (const moduleId of modules) {
        await platformQuery(
          `INSERT INTO crm_access_profile_permissions
            (profile_id, module_id, can_menu, can_view, can_create, can_edit, can_delete)
           VALUES ($1, $2, true, true, true, true, true)
           ON CONFLICT (profile_id, module_id) DO NOTHING`,
          [profileId, moduleId],
        )
      }

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
    })

    await platformQuery(
      `UPDATE crm_tenants SET status = 'active', updated_at = now() WHERE id = $1`,
      [tenantId],
    )

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

    const tables = [
      'crm_report_runs',
      'crm_reports',
      'crm_report_folders',
      'crm_entity_notes',
      'crm_entity_files',
      'crm_notifications',
      'crm_recent_views',
      'crm_archived_records',
      'crm_entity_journey_states',
      'crm_stock_reservations',
      'crm_stock_movements',
      'crm_inventory_positions',
      'crm_stock_receipt_lines',
      'crm_stock_receipts',
      'crm_purchase_line_items',
      'crm_purchases',
      'crm_invoice_payments',
      'crm_invoice_line_items',
      'crm_invoices',
      'crm_quote_line_items',
      'crm_quotes',
      'crm_opportunity_line_items',
      'crm_opportunities',
      'crm_project_work_items',
      'crm_project_work_groups',
      'crm_project_team_members',
      'crm_projects',
      'crm_solicitud_team_members',
      'crm_solicitudes',
      'crm_activities',
      'crm_contacts',
      'crm_company_branches',
      'crm_company_addresses',
      'crm_companies',
      'crm_products',
      'crm_product_categories',
      'crm_warehouses',
      'crm_organization_settings',
      'crm_access_profile_permissions',
      'crm_access_profiles',
      'crm_tenant_memberships',
      'crm_user_auth_sessions',
    ]

    for (const table of tables) {
      const exists = await platformQuery<{ reg: string | null }>(
        `SELECT to_regclass($1) AS reg`,
        [`public.${table}`],
      )
      if (!exists.rows[0]?.reg) continue
      const col = await platformQuery<{ ok: boolean }>(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'tenant_id'
        ) AS ok`,
        [table],
      )
      if (col.rows[0]?.ok) {
        await platformQuery(`DELETE FROM ${table} WHERE tenant_id = $1`, [tenant.id])
      }
    }

    await platformQuery(
      `DELETE FROM crm_user_verification_tokens t
       USING crm_users u
       WHERE t.user_id = u.id AND u.tenant_id = $1`,
      [tenant.id],
    )
    await platformQuery(`DELETE FROM crm_users WHERE tenant_id = $1`, [tenant.id])

    await platformQuery(`DELETE FROM crm_tenants WHERE id = $1`, [tenant.id])
    count++
  }

  return count
}
