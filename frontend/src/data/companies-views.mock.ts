import type { CompanyListItem } from '@/data/companies.mock'
import type { CompanyFilters } from '@/lib/company-filters'
import { matchesCompanyFilters } from '@/lib/company-filters'
import { normalizeCompanyLifecycle } from '@/lib/company-form'

export function getCompaniesBoardDataset(): CompanyListItem[] {
  return []
}

export function filterCompaniesByQuery(
  companies: CompanyListItem[],
  query: string,
): CompanyListItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return companies
  return companies.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.owner.toLowerCase().includes(q),
  )
}

export function filterCompanies(
  companies: CompanyListItem[],
  query: string,
  filters?: CompanyFilters,
): CompanyListItem[] {
  let result = filterCompaniesByQuery(companies, query)
  if (filters) {
    result = result.filter((c) => matchesCompanyFilters(c, filters))
  }
  return result
}

export const COMPANY_KANBAN_COLUMNS = [
  { lifecycle: 'Prospecto' as const, description: 'En seguimiento' },
  { lifecycle: 'Cliente' as const, description: 'Cuentas activas' },
  { lifecycle: 'Proveedor' as const, description: 'Socios y suministro' },
]

export type CompanySegmentDef = {
  id: string
  name: string
  description: string
  accentClass: string
  matches: (company: CompanyListItem) => boolean
}

export const companySegments: CompanySegmentDef[] = [
  {
    id: 'clientes-activas',
    name: 'Clientes activas',
    description: 'Empresas en etapa Cliente con cuenta operativa activa.',
    accentClass: 'border-emerald-500',
    matches: (c) => c.lifecycle === 'Cliente' && c.operationalStatus === 'Activa',
  },
  {
    id: 'prospectos',
    name: 'Prospectos en pipeline',
    description: 'Cuentas en etapa Prospecto con seguimiento comercial.',
    accentClass: 'border-sky-500',
    matches: (c) => c.lifecycle === 'Prospecto',
  },
  {
    id: 'proveedores',
    name: 'Proveedores',
    description: 'Empresas en etapa Proveedor.',
    accentClass: 'border-violet-500',
    matches: (c) => normalizeCompanyLifecycle(c.lifecycle) === 'Proveedor',
  },
  {
    id: 'inactivas',
    name: 'Cuentas inactivas',
    description: 'Estado operativo inactivo o archivado.',
    accentClass: 'border-amber-500',
    matches: (c) => c.operationalStatus === 'Inactiva',
  },
  {
    id: 'enterprise',
    name: 'Enterprise (+500)',
    description: 'Organizaciones con más de 500 empleados.',
    accentClass: 'border-orange-500',
    matches: (c) => {
      const n = Number.parseInt(c.employees.replace(/\D/g, ''), 10)
      return !Number.isNaN(n) && n >= 500
    },
  },
  {
    id: 'sin-seguimiento',
    name: 'Sin seguimiento reciente',
    description: 'Última actividad hace más de 2 días.',
    accentClass: 'border-primary',
    matches: (c) => {
      const v = c.lastActivity.toLowerCase()
      return !v.includes('hoy') && !v.includes('ayer')
    },
  },
]

export function countSegmentMatches(
  companies: CompanyListItem[],
  segment: CompanySegmentDef,
): number {
  return companies.filter(segment.matches).length
}
