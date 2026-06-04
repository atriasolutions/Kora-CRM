import type { PurchaseListItem } from '@/data/purchases.mock'
import { purchaseStatusVariant } from '@/lib/purchase-display'
import type { ModuleListConfig } from '@/types/list-module'

export type { PurchaseListItem }

export const purchasesListConfig: ModuleListConfig<PurchaseListItem> = {
  title: 'Compras',
  description: 'Órdenes de compra a proveedores.',
  entityPlural: 'compras',
  newItemLabel: 'Nueva compra',
  total: 0,
  seeds: [],
  minTableWidth: '1100px',
  getDetailPath: (row) => `/compras/${row.id}`,
  searchFilter: (row, q) =>
    row.reference.toLowerCase().includes(q) ||
    row.supplier.toLowerCase().includes(q) ||
    row.productSummary.toLowerCase().includes(q) ||
    row.owner.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Orden de compra',
      sortable: true,
      className: 'w-[180px]',
      title: (r) => r.reference,
      subtitle: (r) => r.supplier,
    },
    {
      kind: 'text',
      header: 'Productos',
      sortable: true,
      className: 'min-w-[200px]',
      cell: (r) => r.productSummary,
    },
    {
      kind: 'text',
      header: 'Fecha',
      sortable: true,
      className: 'w-[120px]',
      cell: (r) => r.orderDate,
    },
    {
      kind: 'text',
      header: 'Monto',
      sortable: true,
      className: 'w-[110px]',
      cell: (r) => r.amount,
      sortValue: (r) => r.amountNum,
    },
    {
      kind: 'text',
      header: 'Responsable',
      sortable: true,
      className: 'w-[130px]',
      cell: (r) => r.owner,
    },
    {
      kind: 'badge',
      header: 'Estado',
      sortable: true,
      className: 'w-[120px]',
      label: (r) => r.status,
      variant: (r) => purchaseStatusVariant(r.status),
    },
  ],
}
