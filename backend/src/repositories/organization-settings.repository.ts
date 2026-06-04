import { pool } from '../db/pool.js'
import {
  mapOrganizationSettings,
  type OrganizationSettingsRow,
} from '../mappers/settings.mapper.js'
import { badRequest } from '../middleware/errors.js'
import * as geoRepo from './geo.repository.js'
import { validateRegionCommuneInput } from '../services/geo.service.js'
import type {
  OrganizationSettings,
  UpdateOrganizationSettingsInput,
} from '../types/settings.js'

const SELECT_COLUMNS = `
  id, legal_name, trade_name, tagline, rut, giro, address, city, region, commune,
  phone, email, logo_url, default_vat_percent
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

async function ensureOrganizationRow(): Promise<OrganizationSettingsRow> {
  const existing = await pool.query<OrganizationSettingsRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM crm_organization_settings
     ORDER BY updated_at DESC
     LIMIT 1`,
  )
  if (existing.rows[0]) return existing.rows[0]

  const inserted = await pool.query<OrganizationSettingsRow>(
    `INSERT INTO crm_organization_settings (
      legal_name, trade_name, tagline, rut, giro, address, city, region, commune,
      phone, email, logo_url, default_vat_percent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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

  const nextRegion =
    input.region !== undefined ? input.region.trim() : (current.region ?? '')
  const nextCommune =
    input.commune !== undefined ? input.commune.trim() : (current.commune ?? '')
  if (input.region !== undefined || input.commune !== undefined) {
    const catalog = await geoRepo.getGeoCatalog()
    const geoError = validateRegionCommuneInput(catalog, nextRegion, nextCommune)
    if (geoError) throw badRequest(geoError)
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
  ]

  for (const [key, column] of fieldMap) {
    if (input[key] !== undefined) {
      sets.push(`${column} = $${idx++}`)
      values.push(input[key])
    }
  }

  if (sets.length === 0) return mapOrganizationSettings(current)

  sets.push(`updated_at = now()`)
  values.push(current.id)

  const result = await pool.query<OrganizationSettingsRow>(
    `UPDATE crm_organization_settings
     SET ${sets.join(', ')}
     WHERE id = $${idx}
     RETURNING ${SELECT_COLUMNS}`,
    values,
  )

  return mapOrganizationSettings(result.rows[0]!)
}
