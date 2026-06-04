import type { QuoteListItem } from '@/data/quotes.mock'
import { quoteStatusVariant } from '@/lib/quote-display'
import type { ModuleListConfig } from '@/types/list-module'

export type { QuoteListItem }

export const quotesListConfig: ModuleListConfig<QuoteListItem> = {
  title: 'Cotizaciones',
  description:
    'Propuestas comerciales vinculadas a oportunidades. Una empresa puede tener varias oportunidades y cada oportunidad varias cotizaciones.',
  entityPlural: 'cotizaciones',
  newItemLabel: 'Nueva cotización',
  total: 0,
  seeds: [],
  minTableWidth: '1180px',
  getDetailPath: (row) => `/cotizaciones/${row.id}`,
  searchFilter: (row, q) =>
    row.code.toLowerCase().includes(q) ||
    row.title.toLowerCase().includes(q) ||
    row.opportunityName.toLowerCase().includes(q) ||
    row.companyName.toLowerCase().includes(q) ||
    row.owner.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Cotización',
      sortable: true,
      className: 'w-[220px]',
      title: (r) => r.code,
      subtitle: (r) => r.title,
    },
    {
      kind: 'text',
      header: 'Oportunidad',
      sortable: true,
      className: 'w-[180px]',
      cell: (r) => r.opportunityName,
    },
    {
      kind: 'text',
      header: 'Empresa',
      sortable: true,
      className: 'w-[150px]',
      cell: (r) => r.companyName,
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
      kind: 'badge',
      header: 'Estado',
      sortable: true,
      className: 'w-[110px]',
      label: (r) => r.status,
      variant: (r) => quoteStatusVariant(r.status),
    },
    {
      kind: 'text',
      header: 'Válida hasta',
      sortable: true,
      className: 'w-[120px]',
      cell: (r) => r.validUntil,
    },
    {
      kind: 'text',
      header: 'Creada',
      sortable: true,
      className: 'w-[120px]',
      cell: (r) => r.issueDate,
    },
    {
      kind: 'text',
      header: 'Responsable',
      sortable: true,
      className: 'w-[140px]',
      cell: (r) => r.owner,
    },
  ],
}
