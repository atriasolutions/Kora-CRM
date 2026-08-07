import type { ActivityListItem } from '@/data/activities.mock'
import { renderActivityRelatedNameCell } from '@/components/activities/ActivityRelatedNameLink'
import {
  activityPriorityVariant,
  activityStatusVariant,
  activityRelatedLabel,
} from '@/lib/activity-display'
import type { ModuleListConfig } from '@/types/list-module'

export type { ActivityListItem }

export const activitiesListConfig: ModuleListConfig<ActivityListItem> = {
  title: 'Actividades',
  description: 'Tareas, llamadas, reuniones y seguimiento del equipo comercial.',
  entityPlural: 'actividades',
  newItemLabel: 'Nueva actividad',
  total: 0,
  seeds: [],
  minTableWidth: '1100px',
  getDetailPath: (row) => `/actividades/${row.id}`,
  searchFilter: (row, q) =>
    row.title.toLowerCase().includes(q) ||
    row.relatedName.toLowerCase().includes(q) ||
    row.companyName.toLowerCase().includes(q) ||
    row.assignee.toLowerCase().includes(q) ||
    row.typeLabel.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Actividad',
      sortable: true,
      sortKey: 'title',
      className: 'w-[220px]',
      title: (r) => r.title,
      subtitle: (r) => r.typeLabel,
    },
    {
      kind: 'custom',
      header: 'Relacionado',
      className: 'w-[160px]',
      render: renderActivityRelatedNameCell,
    },
    {
      kind: 'text',
      header: 'Tipo vínculo',
      sortable: true,
      className: 'w-[110px]',
      cell: (r) => activityRelatedLabel(r.relatedType),
    },
    {
      kind: 'text',
      header: 'Empresa',
      sortable: true,
      className: 'w-[140px]',
      cell: (r) => r.companyName,
    },
    {
      kind: 'badge',
      header: 'Prioridad',
      sortable: true,
      className: 'w-[100px]',
      label: (r) => r.priority,
      variant: (r) => activityPriorityVariant(r.priority),
    },
    {
      kind: 'text',
      header: 'Vencimiento',
      sortable: true,
      sortKey: 'dueAt',
      className: 'w-[130px]',
      cell: (r) => r.due,
      sortValue: (r) => r.scheduledAt || r.createdAt || r.due,
    },
    {
      kind: 'text',
      header: 'Asignado',
      sortable: true,
      sortKey: 'assignee',
      className: 'w-[130px]',
      cell: (r) => r.assignee,
    },
    {
      kind: 'badge',
      header: 'Estado',
      sortable: true,
      sortKey: 'status',
      className: 'w-[110px]',
      label: (r) => r.status,
      variant: (r) => activityStatusVariant(r.status),
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
