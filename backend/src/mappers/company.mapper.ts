import type { CompanyListItem } from '../types/company.js'
import { entityImageUrlForList } from '../utils/entity-image.js'
import { formatActivityLabel, toIsoString } from '../utils/format.js'

export type CompanyRow = {
  id: string
  name: string
  logo_url: string | null
  rut: string | null
  headquarters_street: string | null
  industry: string | null
  city: string | null
  employees: string | null
  owner_name: string | null
  lifecycle: CompanyListItem['lifecycle']
  operational_status: CompanyListItem['operationalStatus']
  last_activity_at: Date | null
  created_at: Date
  created_by_id: string | null
  created_by_name: string | null
  updated_at: Date
  updated_by_id: string | null
  updated_by_name: string | null
}

function normalizeCompanyLifecycleFromDb(
  lifecycle: string,
): CompanyListItem['lifecycle'] {
  if (lifecycle === 'Lead') return 'Prospecto'
  return lifecycle as CompanyListItem['lifecycle']
}

export function mapCompanyRow(row: CompanyRow): CompanyListItem {
  return {
    id: row.id,
    name: row.name,
    logoUrl: entityImageUrlForList(`/api/v1/companies/${row.id}/logo`, row.logo_url),
    rut: row.rut ?? '',
    headquartersStreet: row.headquarters_street ?? undefined,
    industry: row.industry ?? '',
    city: row.city ?? '',
    employees: row.employees ?? '',
    owner: row.owner_name ?? '',
    lifecycle: normalizeCompanyLifecycleFromDb(String(row.lifecycle)),
    operationalStatus: row.operational_status,
    lastActivity: formatActivityLabel(row.last_activity_at),
    createdAt: toIsoString(row.created_at),
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name ?? '',
    updatedAt: toIsoString(row.updated_at),
    updatedById: row.updated_by_id ?? '',
    updatedByName: row.updated_by_name ?? '',
  }
}

/** Ficha individual: incluye logo embebido (data URL) si existe. */
export function mapCompanyDetail(row: CompanyRow): CompanyListItem {
  return {
    ...mapCompanyRow(row),
    logoUrl: row.logo_url?.trim() ?? '',
  }
}
