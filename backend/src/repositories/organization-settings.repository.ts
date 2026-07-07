import { tenantQuery } from '../db/tenant-query.js'
import { tenantWhereParam } from '../lib/tenant-sql.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import {
  mapOrganizationSettings,
  type OrganizationSettingsRow,
} from '../mappers/settings.mapper.js'
import { badRequest } from '../middleware/errors.js'
import * as geoRepo from './geo.repository.js'
import { validateRegionCommuneInput } from '../services/geo.service.js'
import { loadTenantScopedUserRow } from './users.repository.js'
import type {
  OrganizationSettings,
  UpdateOrganizationSettingsInput,
  InvoicingMode,
} from '../types/settings.js'

const SELECT_COLUMNS = `
  id, legal_name, trade_name, tagline, rut, giro, address, city, region, commune,
  phone, email, logo_url, default_vat_percent, invoicing_mode, economic_activity_code,
  default_solicitud_assignee_user_id, default_solicitud_assignee_name,
  privacy_policy_url, privacy_contact_email, dpo_name, privacy_policy_version, data_retention_days
`

const DEFAULTS = {
  legal_name: 'Kora SpA',
  trade_name: 'Kora CRM',
  tagline: 'CRM comercial integral',
  rut: '76.999.888-7',
  giro: 'Servicios de software',
  address: 'Av. Providencia 1200, Santiago',
  city: 'Santiago',
  region: 'Metropolitana de Santiago',
  commune: 'Santiago',
  phone: '+56 2 2345 6789',
  email: 'hola@kora.io',
  logo_url: '',
  default_vat_percent: 19,
}

function normalizeOrganizationSettingValue(
  key: keyof UpdateOrganizationSettingsInput,
  value: unknown,
): unknown {
  if (key === 'defaultSolicitudAssigneeUserId') {
    if (value == null || value === '') return null
    if (typeof value !== 'string') {
      throw badRequest('El responsable predeterminado de solicitudes no es válido.')
    }
    return value
  }
  if (key === 'logoUrl') {
    return typeof value === 'string' ? value : ''
  }
  if (key === 'privacyPolicyUrl' || key === 'privacyContactEmail' || key === 'dpoName') {
    if (value == null) return null
    const trimmed = typeof value === 'string' ? value.trim() : ''
    return trimmed || null
  }
  if (key === 'dataRetentionDays') {
    const n = Number(value)
    return Number.isFinite(n) ? n : 2555
  }
  return value
}

async function ensureOrganizationRow(): Promise<OrganizationSettingsRow> {
  const existing = await tenantQuery<OrganizationSettingsRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_organization_settings
     WHERE ${tenantWhereParam(1)}
     ORDER BY updated_at DESC
     LIMIT 1`,
    [getTenantIdOrDefault()],
  )
  if (existing.rows[0]) return existing.rows[0]

  const inserted = await tenantQuery<OrganizationSettingsRow>(
    `INSERT INTO crm_organization_settings (
      legal_name, trade_name, tagline, rut, giro, address, city, region, commune,
      phone, email, logo_url, default_vat_percent, tenant_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING ${SELECT_COLUMNS}`,
    [
      DEFAULTS.legal_name,
      DEFAULTS.trade_name,
      DEFAULTS.tagline,
      DEFAULTS.rut,
      DEFAULTS.giro,
      DEFAULTS.address,
      DEFAULTS.city,
      DEFAULTS.region,
      DEFAULTS.commune,
      DEFAULTS.phone,
      DEFAULTS.email,
      DEFAULTS.logo_url,
      DEFAULTS.default_vat_percent,
      getTenantIdOrDefault(),
    ],
  )
  return inserted.rows[0]!
}

export async function getOrganizationSettings(): Promise<OrganizationSettings> {
  const row = await ensureOrganizationRow()
  return mapOrganizationSettings(row)
}

export async function updateOrganizationSettings(
  input: UpdateOrganizationSettingsInput,
): Promise<OrganizationSettings> {
  const current = await ensureOrganizationRow()

  if (input.legalName !== undefined && !input.legalName.trim()) {
    throw badRequest('El nombre legal es obligatorio')
  }
  if (input.email !== undefined && !input.email.trim()) {
    throw badRequest('El email es obligatorio')
  }

  const nextInvoicingMode: InvoicingMode | undefined =
    input.invoicingMode !== undefined ? input.invoicingMode : undefined
  if (nextInvoicingMode === 'sii') {
    const rut = (input.rut ?? current.rut ?? '').trim()
    const legalName = (input.legalName ?? current.legal_name ?? '').trim()
    const giro = (input.giro ?? current.giro ?? '').trim()
    const commune = (input.commune ?? current.commune ?? '').trim()
    const activityCode =
      input.economicActivityCode !== undefined
        ? input.economicActivityCode
        : current.economic_activity_code
    if (!rut) throw badRequest('RUT obligatorio para facturación integrada al SII.')
    if (!legalName) throw badRequest('Razón social obligatoria para facturación SII.')
    if (!giro) throw badRequest('Giro obligatorio para facturación SII.')
    if (!commune) throw badRequest('Comuna obligatoria para facturación SII.')
    if (activityCode == null || !Number.isFinite(Number(activityCode))) {
      throw badRequest('Código de actividad económica obligatorio para facturación SII.')
    }
  }

  const nextRegion =
    input.region !== undefined ? input.region.trim() : (current.region ?? '')
  const nextCommune =
    input.commune !== undefined ? input.commune.trim() : (current.commune ?? '')
  if (input.region !== undefined || input.commune !== undefined) {
    const catalog = await geoRepo.getGeoCatalog()
    const geoError = validateRegionCommuneInput(catalog, nextRegion, nextCommune)
    if (geoError) throw badRequest(geoError)
  }

  if (input.defaultSolicitudAssigneeUserId !== undefined) {
    const assigneeId = input.defaultSolicitudAssigneeUserId
    if (assigneeId == null || assigneeId === '') {
      input.defaultSolicitudAssigneeUserId = null
      if (input.defaultSolicitudAssigneeName === undefined) {
        input.defaultSolicitudAssigneeName = ''
      }
    } else {
      const assignee = await loadTenantScopedUserRow(
        assigneeId,
        getTenantIdOrDefault(),
      )
      if (!assignee) {
        throw badRequest('El responsable predeterminado no existe o no está disponible.')
      }
      input.defaultSolicitudAssigneeName = assignee.name?.trim() || ''
    }
  }

  const sets: string[] = []
  const values: unknown[] = []
  let idx = 1

  const fieldMap: [keyof UpdateOrganizationSettingsInput, string][] = [
    ['legalName', 'legal_name'],
    ['tradeName', 'trade_name'],
    ['tagline', 'tagline'],
    ['rut', 'rut'],
    ['giro', 'giro'],
    ['address', 'address'],
    ['city', 'city'],
    ['region', 'region'],
    ['commune', 'commune'],
    ['phone', 'phone'],
    ['email', 'email'],
    ['logoUrl', 'logo_url'],
    ['defaultVatPercent', 'default_vat_percent'],
    ['invoicingMode', 'invoicing_mode'],
    ['economicActivityCode', 'economic_activity_code'],
    ['defaultSolicitudAssigneeUserId', 'default_solicitud_assignee_user_id'],
    ['defaultSolicitudAssigneeName', 'default_solicitud_assignee_name'],
    ['privacyPolicyUrl', 'privacy_policy_url'],
    ['privacyContactEmail', 'privacy_contact_email'],
    ['dpoName', 'dpo_name'],
    ['privacyPolicyVersion', 'privacy_policy_version'],
    ['dataRetentionDays', 'data_retention_days'],
  ]

  for (const [key, column] of fieldMap) {
    if (input[key] !== undefined) {
      sets.push(`${column} = $${idx++}`)
      values.push(normalizeOrganizationSettingValue(key, input[key]))
    }
  }

  if (sets.length === 0) return mapOrganizationSettings(current)

  sets.push(`updated_at = now()`)
  values.push(current.id, getTenantIdOrDefault())

  const result = await tenantQuery<OrganizationSettingsRow>(
    `UPDATE crm_organization_settings
     SET ${sets.join(', ')}
     WHERE id = $${idx}::uuid AND ${tenantWhereParam(idx + 1)}::uuid
     RETURNING ${SELECT_COLUMNS}`,
    values,
  )

  return mapOrganizationSettings(result.rows[0]!)
}
