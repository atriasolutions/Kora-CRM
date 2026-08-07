import type { BitacoraListItem } from '@/data/bitacora.mock'
import { renderBitacoraSolicitudNameCell } from '@/components/bitacora/BitacoraSolicitudNameLink'
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
      kind: 'custom',
      header: 'Solicitud',
      sortable: true,
      className: 'w-[220px]',
      render: renderBitacoraSolicitudNameCell,
    },
    {
      kind: 'text',
      header: 'Fecha',
      sortable: true,
      sortKey: 'workDate',
      className: 'w-[120px]',
      cell: (r) => formatBitacoraWorkDate(r.workDate),
      sortValue: (r) => r.workDate,
    },
    {
      kind: 'text',
      header: 'Horas',
      sortable: true,
      sortKey: 'hours',
      className: 'w-[80px]',
      cell: (r) => formatBitacoraHours(r.hours),
      sortValue: (r) => r.hours,
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
      sortKey: 'companyName',
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
