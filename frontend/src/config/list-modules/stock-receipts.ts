import type { StockReceiptListItem } from '@/data/stock-receipts.mock'
import type { ModuleListConfig } from '@/types/list-module'
import { stockReceiptStatusVariant } from '@/lib/stock-receipt-display'

export type { StockReceiptListItem }

export const stockReceiptsListConfig: ModuleListConfig<StockReceiptListItem> = {
  title: 'Ingresos',
  description: 'Ingresos de stock a bodega.',
  entityPlural: 'ingresos',
  newItemLabel: 'Nuevo ingreso',
  total: 0,
  seeds: [],
  minTableWidth: '1000px',
  getDetailPath: (row) => `/ingresos/${row.id}`,
  searchFilter: (row, q) =>
    row.number.toLowerCase().includes(q) ||
    row.externalReference.toLowerCase().includes(q) ||
    (row.purchaseReference?.toLowerCase().includes(q) ?? false) ||
    row.productSummary.toLowerCase().includes(q) ||
    row.warehouse.toLowerCase().includes(q) ||
    row.owner.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Ingreso',
      sortable: true,
      className: 'w-[160px]',
      title: (r) => r.number,
      subtitle: (r) => r.externalReference,
    },
    {
      kind: 'text',
      header: 'OC',
      sortable: true,
      className: 'w-[140px]',
      cell: (r) => r.purchaseReference ?? '—',
    },
    {
      kind: 'text',
      header: 'Bodega',
      sortable: true,
      className: 'w-[130px]',
      cell: (r) => r.warehouse,
    },
    {
      kind: 'badge',
      header: 'Estado',
      sortable: true,
      className: 'w-[110px]',
      label: (r) => r.status,
      variant: (r) => stockReceiptStatusVariant(r.status),
    },
    {
      kind: 'text',
      header: 'Productos',
      sortable: true,
      className: 'min-w-[180px]',
      cell: (r) => r.productSummary,
    },
    {
      kind: 'text',
      header: 'Fecha',
      sortable: true,
      className: 'w-[120px]',
      cell: (r) => r.confirmedAt ?? r.createdAt,
    },
    {
      kind: 'text',
      header: 'Responsable',
      sortable: true,
      className: 'w-[130px]',
      cell: (r) => r.owner,
    },
  ],
}
