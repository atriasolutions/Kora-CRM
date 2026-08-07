import type { SolicitudListItem } from '@/data/solicitudes.mock'
import {
  solicitudPriorityVariant,
  solicitudStatusVariant,
} from '@/lib/solicitud-display'
import { formatChileDateTimeDisplay } from '@/lib/chile-timezone'
import type { ModuleListConfig } from '@/types/list-module'

export type { SolicitudListItem }

export const solicitudesListConfig: ModuleListConfig<SolicitudListItem> = {
  title: 'Solicitudes',
  description: 'Peticiones internas y seguimiento de entregas.',
  entityPlural: 'solicitudes',
  newItemLabel: 'Nueva solicitud',
  total: 0,
  seeds: [],
  minTableWidth: '960px',
  getDetailPath: (row) => `/solicitudes/${row.id}`,
  searchFilter: (row, q) =>
    row.title.toLowerCase().includes(q) ||
    row.code.toLowerCase().includes(q) ||
    row.assignee.toLowerCase().includes(q) ||
    row.description.toLowerCase().includes(q) ||
    (row.companyName ?? '').toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Solicitud',
      sortable: true,
      sortKey: 'title',
      className: 'w-[240px]',
      title: (r) => r.title,
      subtitle: (r) => r.code,
    },
    {
      kind: 'badge',
      header: 'Estado',
      sortable: true,
      sortKey: 'status',
      className: 'w-[160px]',
      label: (r) => r.status,
      variant: (r) => solicitudStatusVariant(r.status),
    },
    {
      kind: 'badge',
      header: 'Prioridad',
      sortable: true,
      sortKey: 'priority',
      className: 'w-[100px]',
      label: (r) => r.priority,
      variant: (r) => solicitudPriorityVariant(r.priority),
    },
    {
      kind: 'text',
      header: 'Empresa',
      sortable: true,
      sortKey: 'companyName',
      className: 'w-[160px]',
      cell: (r) => r.companyName || '—',
    },
    {
      kind: 'text',
      header: 'Responsable',
      sortable: true,
      sortKey: 'assignee',
      className: 'w-[150px]',
      cell: (r) => r.assignee || '—',
    },
    {
      kind: 'text',
      header: 'Actualizado',
      sortable: true,
      sortKey: 'updatedAt',
      className: 'w-[180px]',
      cell: (r) => formatChileDateTimeDisplay(r.updatedAt),
    },
    {
      kind: 'text',
      header: 'Creado',
      sortable: true,
      sortKey: 'createdAt',
      defaultHidden: true,
      className: 'w-[180px]',
      cell: (r) => formatChileDateTimeDisplay(r.createdAt),
    },
  ],
}
