import { pool } from '../db/pool.js'
import { notFound } from '../middleware/errors.js'
import type {
  CompanyAddressDto,
  CompanyBranchDto,
  CompanyHeadquartersInput,
  CompanyLocationsDto,
} from '../types/company-location.js'

type AddressRow = {
  id: string
  label: string | null
  street: string | null
  city: string | null
  commune: string | null
  region: string | null
  country: string | null
  postal_code: string | null
  lat: string | number | null
  lng: string | number | null
}

type BranchRow = {
  id: string
  name: string
  address: {
    street?: string
    city?: string
    commune?: string
    region?: string
    country?: string
    postalCode?: string
    lat?: number
    lng?: number
  } | null
  phone: string | null
}

function num(value: string | number | null | undefined, fallback = 0): number {
  if (value == null || value === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function mapAddressRow(row: AddressRow): CompanyAddressDto {
  return {
    id: row.id,
    label: row.label?.trim() || 'Dirección',
    street: row.street?.trim() || '',
    city: row.city?.trim() || '',
    commune: row.commune?.trim() || undefined,
    region: row.region?.trim() || '',
    country: row.country?.trim() || 'Chile',
    postalCode: row.postal_code?.trim() || undefined,
    lat: num(row.lat, -33.4489),
    lng: num(row.lng, -70.6693),
  }
}

function mapBranchRow(row: BranchRow): CompanyBranchDto {
  const addr = row.address ?? {}
  return {
    id: row.id,
    name: row.name,
    street: addr.street?.trim() || '',
    city: addr.city?.trim() || '',
    region: addr.region?.trim() || '',
    country: addr.country?.trim() || 'Chile',
    phone: row.phone?.trim() || undefined,
    lat: num(addr.lat, -33.4489),
    lng: num(addr.lng, -70.6693),
    commune: addr.commune?.trim() || undefined,
    postalCode: addr.postalCode?.trim() || undefined,
  }
}

async function assertCompanyExists(companyId: string): Promise<void> {
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM crm_companies WHERE id = $1 AND deleted_at IS NULL`,
    [companyId],
  )
  if (!result.rows[0]) throw notFound('Empresa no encontrada')
}

export async function upsertCompanyHeadquarters(
  companyId: string,
  hq: CompanyHeadquartersInput,
): Promise<void> {
  await assertCompanyExists(companyId)

  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM crm_company_addresses
     WHERE company_id = $1 AND is_headquarters = true
     LIMIT 1`,
    [companyId],
  )

  const values = [
    hq.label?.trim() || 'Casa matriz',
    hq.street?.trim() || null,
    hq.city?.trim() || null,
    hq.commune?.trim() || null,
    hq.region?.trim() || null,
    hq.country?.trim() || 'Chile',
    hq.postalCode?.trim() || null,
    hq.lat ?? -33.4489,
    hq.lng ?? -70.6693,
  ]

  if (existing.rows[0]) {
    await pool.query(
      `UPDATE crm_company_addresses SET
        label = $2,
        street = $3,
        city = $4,
        commune = $5,
        region = $6,
        country = $7,
        postal_code = $8,
        lat = $9,
        lng = $10
       WHERE id = $1`,
      [existing.rows[0].id, ...values],
    )
    return
  }

  await pool.query(
    `INSERT INTO crm_company_addresses (
      id, company_id, label, street, city, commune, region, country,
      postal_code, lat, lng, is_headquarters
    ) VALUES (
      COALESCE($2::uuid, gen_random_uuid()), $1, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, true
    )`,
    [companyId, hq.id && isUuid(hq.id) ? hq.id : null, ...values],
  )
}

export async function getCompanyLocations(
  companyId: string,
): Promise<CompanyLocationsDto> {
  await assertCompanyExists(companyId)

  const [headquartersResult, addressResult, branchResult] = await Promise.all([
    pool.query<AddressRow>(
      `SELECT id, label, street, city, commune, region, country, postal_code, lat, lng
       FROM crm_company_addresses
       WHERE company_id = $1 AND is_headquarters = true
       LIMIT 1`,
      [companyId],
    ),
    pool.query<AddressRow>(
      `SELECT id, label, street, city, commune, region, country, postal_code, lat, lng
       FROM crm_company_addresses
       WHERE company_id = $1 AND is_headquarters = false
       ORDER BY label ASC`,
      [companyId],
    ),
    pool.query<BranchRow>(
      `SELECT id, name, address, phone
       FROM crm_company_branches
       WHERE company_id = $1
       ORDER BY name ASC`,
      [companyId],
    ),
  ])

  const hqRow = headquartersResult.rows[0]

  return {
    headquarters: hqRow ? mapAddressRow(hqRow) : null,
    addresses: addressResult.rows.map(mapAddressRow),
    branches: branchResult.rows.map(mapBranchRow),
  }
}

export async function replaceCompanyLocations(
  companyId: string,
  input: CompanyLocationsDto,
): Promise<CompanyLocationsDto> {
  await assertCompanyExists(companyId)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      `DELETE FROM crm_company_addresses
       WHERE company_id = $1 AND is_headquarters = false`,
      [companyId],
    )
    await client.query(`DELETE FROM crm_company_branches WHERE company_id = $1`, [
      companyId,
    ])

    for (const addr of input.addresses) {
      await client.query(
        `INSERT INTO crm_company_addresses (
          id, company_id, label, street, city, commune, region, country,
          postal_code, lat, lng, is_headquarters
        ) VALUES (
          COALESCE($2::uuid, gen_random_uuid()), $1, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, false
        )`,
        [
          companyId,
          isUuid(addr.id) ? addr.id : null,
          addr.label.trim() || 'Dirección',
          addr.street.trim() || null,
          addr.city.trim() || null,
          addr.commune?.trim() || null,
          addr.region.trim() || null,
          addr.country.trim() || 'Chile',
          addr.postalCode?.trim() || null,
          addr.lat,
          addr.lng,
        ],
      )
    }

    for (const branch of input.branches) {
      await client.query(
        `INSERT INTO crm_company_branches (id, company_id, name, address, phone)
         VALUES (COALESCE($2::uuid, gen_random_uuid()), $1, $3, $4::jsonb, $5)`,
        [
          companyId,
          isUuid(branch.id) ? branch.id : null,
          branch.name.trim(),
          JSON.stringify({
            street: branch.street.trim(),
            city: branch.city.trim(),
            commune: branch.commune?.trim() || undefined,
            region: branch.region.trim(),
            country: branch.country.trim() || 'Chile',
            postalCode: branch.postalCode?.trim() || undefined,
            lat: branch.lat,
            lng: branch.lng,
          }),
          branch.phone?.trim() || null,
        ],
      )
    }

    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  if (input.headquarters) {
    await upsertCompanyHeadquarters(companyId, input.headquarters)
  }

  return getCompanyLocations(companyId)
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}
