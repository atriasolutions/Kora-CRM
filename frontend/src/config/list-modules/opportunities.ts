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
      sortKey: 'name',
      className: 'w-[200px]',
      title: (r) => r.name,
      subtitle: (r) => r.company,
    },
    {
      kind: 'text',
      header: 'Contacto',
      sortable: true,
      sortKey: 'contactName',
      className: 'w-[140px]',
      cell: (r) => r.contactName,
    },
    {
      kind: 'text',
      header: 'Monto',
      sortable: true,
      sortKey: 'amount',
      className: 'w-[110px]',
      cell: (r) => r.amount,
      sortValue: (r) => r.amount.replace(/[^\d]/g, ''),
    },
    {
      kind: 'text',
      header: 'Ponderado',
      sortable: true,
      defaultHidden: true,
      className: 'w-[110px]',
      cell: (r) => r.weightedAmount,
      sortValue: (r) => r.weightedAmount.replace(/[^\d]/g, ''),
    },
    {
      kind: 'badge',
      header: 'Etapa',
      sortable: true,
      sortKey: 'stage',
      className: 'w-[120px]',
      label: (r) => r.stage,
      variant: (r) => opportunityStageVariant(r.stage),
    },
    {
      kind: 'badge',
      header: 'Prioridad',
      sortable: true,
      sortKey: 'priority',
      className: 'w-[100px]',
      label: (r) => r.priority,
      variant: (r) => priorityVariant(r.priority),
    },
    {
      kind: 'text',
      header: 'Prob.',
      sortable: true,
      sortKey: 'probability',
      defaultHidden: true,
      className: 'w-[72px]',
      cell: (r) => r.probability,
    },
    {
      kind: 'text',
      header: 'Cierre',
      sortable: true,
      sortKey: 'closeDate',
      className: 'w-[120px]',
      cell: (r) => r.closeDate,
    },
    {
      kind: 'text',
      header: 'Escenario',
      sortable: true,
      sortKey: 'forecast',
      defaultHidden: true,
      className: 'w-[100px]',
      cell: (r) => r.forecast,
    },
    {
      kind: 'text',
      header: 'Responsable',
      sortable: true,
      sortKey: 'owner',
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
    {
      kind: 'text',
      header: 'Resultado',
      sortable: true,
      sortKey: 'outcome',
      defaultHidden: true,
      className: 'w-[100px]',
      cell: (r) => r.outcome,
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
