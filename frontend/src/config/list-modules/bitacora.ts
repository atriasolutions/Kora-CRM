import type { BitacoraListItem } from '@/data/bitacora.mock'
import type { ModuleListConfig } from '@/types/list-module'
import { formatBitacoraHours, formatBitacoraWorkDate } from '@/lib/bitacora-form'

export type { BitacoraListItem }

export const bitacoraListConfig: ModuleListConfig<BitacoraListItem> = {
  title: 'Bitácora',
  description: 'Registro de horas invertidas en solicitudes.',
  entityPlural: 'registros',
  newItemLabel: 'Nueva bitácora',
  total: 0,
  seeds: [],
  minTableWidth: '1050px',
  getDetailPath: (row) => `/bitacora/${row.id}`,
  searchFilter: (row, q) =>
    row.solicitudCode.toLowerCase().includes(q) ||
    row.solicitudTitle.toLowerCase().includes(q) ||
    row.description.toLowerCase().includes(q) ||
    row.assignedUserName.toLowerCase().includes(q) ||
    (row.companyName ?? '').toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Solicitud',
      sortable: true,
      className: 'w-[220px]',
      title: (r) => r.solicitudTitle,
      subtitle: (r) => r.solicitudCode,
    },
    {
      kind: 'text',
      header: 'Fecha',
      sortable: true,
      className: 'w-[120px]',
      cell: (r) => formatBitacoraWorkDate(r.workDate),
    },
    {
      kind: 'text',
      header: 'Horas',
      sortable: true,
      className: 'w-[80px]',
      cell: (r) => formatBitacoraHours(r.hours),
    },
    {
      kind: 'badge',
      header: 'Facturable',
      sortable: true,
      className: 'w-[110px]',
      label: (r) => (r.isBillable ? 'Sí' : 'No'),
      variant: (r) => (r.isBillable ? 'default' : 'secondary'),
    },
    {
      kind: 'text',
      header: 'Empresa',
      sortable: true,
      className: 'w-[150px]',
      cell: (r) => r.companyName || '—',
    },
    {
      kind: 'text',
      header: 'Usuario',
      sortable: true,
      className: 'w-[140px]',
      cell: (r) => r.assignedUserName,
    },
    {
      kind: 'text',
      header: 'Descripción',
      className: 'min-w-[200px]',
      cell: (r) => r.description || '—',
    },
  ],
}
