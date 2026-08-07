import type {
  CompanyLifecycleStatus,
  CompanyListItem,
} from '@/data/companies.mock'
import { formatRutDisplay } from '@/lib/company-location'
import type { ModuleListConfig } from '@/types/list-module'

function lifecycleVariant(
  lifecycle: CompanyLifecycleStatus,
): 'customer' | 'prospect' | 'lead' | 'supplier' {
  switch (lifecycle) {
    case 'Cliente':
      return 'customer'
    case 'Prospecto':
      return 'prospect'
    case 'Proveedor':
      return 'supplier'
    default:
      return 'prospect'
  }
}

export type { CompanyListItem }

export const companiesListConfig: ModuleListConfig<CompanyListItem> = {
  title: 'Empresas',
  description: 'Cuentas y organizaciones vinculadas a tu pipeline.',
  entityPlural: 'empresas',
  newItemLabel: 'Nueva empresa',
  total: 0,
  seeds: [],
  minTableWidth: '1100px',
  rowActions: 'default',
  getDetailPath: (row) => `/empresas/${row.id}`,
  searchFilter: (row, q) =>
    row.name.toLowerCase().includes(q) ||
    row.rut.toLowerCase().includes(q) ||
    row.industry.toLowerCase().includes(q) ||
    row.city.toLowerCase().includes(q) ||
    row.owner.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Empresa',
      sortable: true,
      sortKey: 'name',
      className: 'w-[220px]',
      title: (r) => r.name,
      subtitle: (r) => r.industry,
      avatarUrl: (r) => r.logoUrl,
      initials: (r) => r.name.slice(0, 2).toUpperCase(),
    },
    {
      kind: 'text',
      header: 'RUT',
      sortable: true,
      sortKey: 'rut',
      className: 'w-[130px] font-mono text-xs',
      cell: (r) => (r.rut && r.rut !== '—' ? formatRutDisplay(r.rut) : '—'),
      sortValue: (r) => r.rut,
    },
    {
      kind: 'text',
      header: 'Ciudad',
      sortable: true,
      sortKey: 'city',
      className: 'w-[120px]',
      cell: (r) => r.city,
    },
    {
      kind: 'text',
      header: 'Empleados',
      sortable: true,
      sortKey: 'employees',
      defaultHidden: true,
      className: 'w-[100px]',
      cell: (r) => r.employees,
      sortValue: (r) => r.employees.replace(/\./g, ''),
    },
    {
      kind: 'text',
      header: 'Responsable',
      sortable: true,
      sortKey: 'owner',
      className: 'w-[140px]',
      cell: (r) => r.owner,
    },
    {
      kind: 'badge',
      header: 'Etapa',
      sortable: true,
      sortKey: 'lifecycle',
      className: 'w-[110px]',
      label: (r) => r.lifecycle,
      variant: (r) => lifecycleVariant(r.lifecycle),
    },
    {
      kind: 'badge',
      header: 'Cuenta',
      sortable: true,
      sortKey: 'operationalStatus',
      className: 'w-[100px]',
      label: (r) => r.operationalStatus,
      variant: (r) => (r.operationalStatus === 'Activa' ? 'customer' : 'muted'),
    },
    {
      kind: 'text',
      header: 'Última actividad',
      sortable: true,
      className: 'w-[160px]',
      cell: (r) => r.lastActivity,
    },
    {
      kind: 'text',
      header: 'Creado',
      sortable: true,
      sortKey: 'createdAt',
      defaultHidden: true,
      className: 'w-[120px]',
      cell: (r) => r.createdAt?.slice(0, 10) || '—',
      sortValue: (r) => r.createdAt || '',
    },
    {
      kind: 'text',
      header: 'Actualizado',
      sortable: true,
      sortKey: 'updatedAt',
      defaultHidden: true,
      className: 'w-[120px]',
      cell: (r) => r.updatedAt?.slice(0, 10) || '—',
      sortValue: (r) => r.updatedAt || '',
    },
  ],
}
