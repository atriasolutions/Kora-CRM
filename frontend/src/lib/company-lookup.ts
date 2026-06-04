import type { CompanyLifecycleStatus, CompanyListItem } from '@/data/companies.mock'

export function isSupplierCompany(company: CompanyListItem): boolean {
  return company.lifecycle === 'Proveedor'
}

export function filterSupplierCompanies(
  companies: CompanyListItem[],
): CompanyListItem[] {
  return companies.filter(isSupplierCompany)
}

export type CompanyLookupPreset = Pick<
  CompanyListItem,
  'id' | 'name' | 'logoUrl' | 'industry' | 'city'
>

/** Ítem de catálogo para lookup cuando la empresa aún no está en el registry. */
export function companyListItemFromPreset(
  preset: CompanyLookupPreset,
  fallbackId?: string,
): CompanyListItem {
  const name = preset.name.trim()
  const id = preset.id.trim() || fallbackId?.trim() || ''
  return {
    id,
    name,
    logoUrl: preset.logoUrl ?? '',
    industry: preset.industry ?? '',
    city: preset.city ?? '',
    rut: '',
    employees: '',
    owner: '',
    lifecycle: 'Cliente',
    operationalStatus: 'Activa',
    lastActivity: '',
    createdAt: '',
    createdById: '',
    createdByName: '',
    updatedAt: '',
    updatedById: '',
    updatedByName: '',
  }
}

export function mergeCompanyLookupPool(
  companies: CompanyListItem[],
  preset?: CompanyLookupPreset,
): CompanyListItem[] {
  const merged = new Map<string, CompanyListItem>()
  for (const company of companies) {
    merged.set(company.id, company)
  }
  if (!preset?.name.trim()) return [...merged.values()]

  const byName = findCompanyByName(companies, preset.name)
  const item = byName ?? companyListItemFromPreset(preset)
  merged.set(item.id, item)
  return [...merged.values()]
}

export function findCompanyById(
  companies: CompanyListItem[],
  companyId: string,
): CompanyListItem | undefined {
  if (!companyId.trim()) return undefined
  return companies.find((c) => c.id === companyId)
}

export function findCompanyByName(
  companies: CompanyListItem[],
  name: string,
): CompanyListItem | undefined {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return undefined
  return companies.find((c) => c.name.trim().toLowerCase() === normalized)
}

export function resolveCompanyIdFromName(
  companies: CompanyListItem[],
  name: string,
): string {
  return findCompanyByName(companies, name)?.id ?? ''
}

/** Id estable del catálogo (co1, co2…) aunque la ficha use ids de tablero o ruta. */
export function resolveCanonicalCompanyId(
  companies: CompanyListItem[],
  company: { id: string; name: string },
): string {
  const routeId = company.id.trim()
  if (routeId && findCompanyById(companies, routeId)) return routeId

  const byName = findCompanyByName(companies, company.name)
  if (byName) return byName.id

  return routeId
}

export function searchCompanies(
  companies: CompanyListItem[],
  query: string,
  limit = 8,
  options?: { lifecycle?: CompanyLifecycleStatus },
): CompanyListItem[] {
  let pool = companies
  if (options?.lifecycle) {
    pool = pool.filter((c) => c.lifecycle === options.lifecycle)
  }

  const q = query.trim().toLowerCase()
  if (!q) {
    return [...pool]
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .slice(0, limit)
  }
  return pool
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.rut.toLowerCase().includes(q),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .slice(0, limit)
}
