import type {
  OrganizationSettings,
  ProductCategory,
  Warehouse,
} from '../types/settings.js'

export type OrganizationSettingsRow = {
  id: string
  legal_name: string
  trade_name: string
  tagline: string | null
  rut: string | null
  giro: string | null
  address: string | null
  city: string | null
  region: string | null
  commune: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  default_vat_percent: string | number | null
}

export type WarehouseRow = {
  id: string
  name: string
  code: string
  address: string | null
  region: string | null
  commune: string | null
  is_default: boolean
  active: boolean
}

export type ProductCategoryRow = {
  id: string
  name: string
  active: boolean
}

export function mapOrganizationSettings(
  row: OrganizationSettingsRow,
): OrganizationSettings {
  return {
    id: row.id,
    legalName: row.legal_name ?? '',
    tradeName: row.trade_name ?? '',
    tagline: row.tagline ?? '',
    rut: row.rut ?? '',
    giro: row.giro ?? '',
    address: row.address ?? '',
    city: row.city ?? '',
    region: row.region ?? '',
    commune: row.commune ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    logoUrl: row.logo_url ?? '',
    defaultVatPercent: Number(row.default_vat_percent ?? 19),
  }
}

export function mapWarehouse(row: WarehouseRow): Warehouse {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    address: row.address ?? '',
    region: row.region ?? '',
    commune: row.commune ?? '',
    isDefault: row.is_default,
    active: row.active,
  }
}

export function mapProductCategory(row: ProductCategoryRow): ProductCategory {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
  }
}
