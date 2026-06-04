import type { OpportunityListItem } from '@/data/opportunities.mock'
import { opportunityStageVariant } from '@/lib/opportunity-journey'
import type { ModuleListConfig } from '@/types/list-module'

function priorityVariant(
  priority: OpportunityListItem['priority'],
): 'destructive' | 'proposal' | 'muted' {
  switch (priority) {
    case 'Alta':
      return 'destructive'
    case 'Media':
      return 'proposal'
    case 'Baja':
    default:
      return 'muted'
  }
}

export type { OpportunityListItem }

export const opportunitiesListConfig: ModuleListConfig<OpportunityListItem> = {
  title: 'Oportunidades',
  description: 'Pipeline comercial y previsión de ingresos.',
  entityPlural: 'oportunidades',
  newItemLabel: 'Nueva oportunidad',
  total: 0,
  seeds: [],
  minTableWidth: '1280px',
  getDetailPath: (row) => `/oportunidades/${row.id}`,
  searchFilter: (row, q) =>
    row.name.toLowerCase().includes(q) ||
    row.company.toLowerCase().includes(q) ||
    row.contactName.toLowerCase().includes(q) ||
    row.owner.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Oportunidad',
      sortable: true,
      className: 'w-[200px]',
      title: (r) => r.name,
      subtitle: (r) => r.company,
    },
    {
      kind: 'text',
      header: 'Contacto',
      sortable: true,
      className: 'w-[140px]',
      cell: (r) => r.contactName,
    },
    {
      kind: 'text',
      header: 'Monto',
      sortable: true,
      className: 'w-[110px]',
      cell: (r) => r.amount,
      sortValue: (r) => r.amount.replace(/[^\d]/g, ''),
    },
    {
      kind: 'text',
      header: 'Ponderado',
      sortable: true,
      className: 'w-[110px]',
      cell: (r) => r.weightedAmount,
      sortValue: (r) => r.weightedAmount.replace(/[^\d]/g, ''),
    },
    {
      kind: 'badge',
      header: 'Etapa',
      sortable: true,
      className: 'w-[120px]',
      label: (r) => r.stage,
      variant: (r) => opportunityStageVariant(r.stage),
    },
    {
      kind: 'badge',
      header: 'Prioridad',
      sortable: true,
      className: 'w-[100px]',
      label: (r) => r.priority,
      variant: (r) => priorityVariant(r.priority),
    },
    {
      kind: 'text',
      header: 'Prob.',
      sortable: true,
      className: 'w-[72px]',
      cell: (r) => r.probability,
    },
    {
      kind: 'text',
      header: 'Cierre',
      sortable: true,
      className: 'w-[120px]',
      cell: (r) => r.closeDate,
    },
    {
      kind: 'text',
      header: 'Escenario',
      sortable: true,
      className: 'w-[100px]',
      cell: (r) => r.forecast,
    },
    {
      kind: 'text',
      header: 'Responsable',
      sortable: true,
      className: 'w-[130px]',
      cell: (r) => r.owner,
    },
    {
      kind: 'text',
      header: 'Última actividad',
      sortable: true,
      className: 'w-[150px]',
      cell: (r) => r.lastActivity,
    },
  ],
}
