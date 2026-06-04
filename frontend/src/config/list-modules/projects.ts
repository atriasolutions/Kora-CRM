import type { ProjectListItem } from '@/data/projects.mock'
import {
  projectHealthVariant,
  projectPriorityVariant,
  projectStatusVariant,
} from '@/lib/project-display'
import { journeyStageVariant } from '@/lib/project-journey'
import { findOpportunityById, resolveProjectRelations } from '@/lib/project-relations'
import type { ModuleListConfig } from '@/types/list-module'

export type { ProjectListItem }

export const projectsListConfig: ModuleListConfig<ProjectListItem> = {
  title: 'Proyectos',
  description: 'Entregas, implementaciones y seguimiento de avance.',
  entityPlural: 'proyectos',
  newItemLabel: 'Nuevo proyecto',
  total: 0,
  seeds: [],
  minTableWidth: '1100px',
  getDetailPath: (row) => `/proyectos/${row.id}`,
  searchFilter: (row, q) =>
    row.name.toLowerCase().includes(q) ||
    row.client.toLowerCase().includes(q) ||
    row.manager.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Proyecto',
      sortable: true,
      className: 'w-[220px]',
      title: (r) => r.name,
      subtitle: (r) => r.client,
    },
    {
      kind: 'badge',
      header: 'Ruta del éxito',
      sortable: true,
      className: 'w-[150px]',
      label: (r) => r.journeyStage,
      variant: (r) => journeyStageVariant(r.journeyStage),
    },
    {
      kind: 'text',
      header: 'Oportunidad',
      sortable: true,
      className: 'w-[160px]',
      cell: (r) => {
        const { opportunityId } = resolveProjectRelations(r)
        if (!opportunityId) return '—'
        const opp = findOpportunityById(opportunityId)
        return opp?.name ?? opportunityId
      },
    },
    {
      kind: 'text',
      header: 'Avance',
      sortable: true,
      className: 'w-[80px]',
      cell: (r) => r.progress,
      sortValue: (r) => r.progressNum,
    },
    {
      kind: 'badge',
      header: 'Salud',
      sortable: true,
      className: 'w-[100px]',
      label: (r) => r.health,
      variant: (r) => projectHealthVariant(r.health),
    },
    {
      kind: 'badge',
      header: 'Prioridad',
      sortable: true,
      className: 'w-[100px]',
      label: (r) => r.priority,
      variant: (r) => projectPriorityVariant(r.priority),
    },
    {
      kind: 'text',
      header: 'Entrega',
      sortable: true,
      className: 'w-[120px]',
      cell: (r) => r.deadline,
    },
    {
      kind: 'text',
      header: 'Presupuesto',
      sortable: true,
      className: 'w-[110px]',
      cell: (r) => r.budget,
      sortValue: (r) => r.budget.replace(/[^\d]/g, ''),
    },
    {
      kind: 'text',
      header: 'Gerente',
      sortable: true,
      className: 'w-[130px]',
      cell: (r) => r.manager,
    },
    {
      kind: 'badge',
      header: 'Estado',
      sortable: true,
      className: 'w-[110px]',
      label: (r) => r.status,
      variant: (r) => projectStatusVariant(r.status),
    },
  ],
}
