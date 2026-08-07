import type { ExpenseListItem } from '@/data/expenses.mock'
import { expenseStatusVariant } from '@/lib/expense-display'
import type { ModuleListConfig } from '@/types/list-module'

export type { ExpenseListItem }

export const gastosListConfig: ModuleListConfig<ExpenseListItem> = {
  title: 'Gastos',
  description: 'Egresos operativos: arriendo, sueldos, impuestos y más.',
  entityPlural: 'gastos',
  newItemLabel: 'Nuevo gasto',
  total: 0,
  seeds: [],
  minTableWidth: '960px',
  getDetailPath: (row) => `/gastos/${row.id}`,
  searchFilter: (row, q) =>
    row.number.toLowerCase().includes(q) ||
    row.concept.toLowerCase().includes(q) ||
    row.category.toLowerCase().includes(q) ||
    (row.supplierName ?? '').toLowerCase().includes(q) ||
    row.owner.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Gasto',
      sortable: true,
      sortKey: 'number',
      className: 'w-[180px]',
      title: (r) => r.number,
      subtitle: (r) => r.concept,
    },
    {
      kind: 'text',
      header: 'Categoría',
      sortable: true,
      sortKey: 'category',
      className: 'w-[120px]',
      cell: (r) => r.category,
    },
    {
      kind: 'text',
      header: 'Monto',
      sortable: true,
      sortKey: 'amount',
      className: 'w-[120px]',
      cell: (r) => r.amount,
      sortValue: (r) => r.amountNum,
    },
    {
      kind: 'text',
      header: 'Fecha',
      sortable: true,
      sortKey: 'expenseDate',
      className: 'w-[120px]',
      cell: (r) => r.expenseDate,
      sortValue: (r) => r.expenseDateIso || r.expenseDate,
    },
    {
      kind: 'text',
      header: 'Proveedor',
      sortable: true,
      sortKey: 'supplierName',
      className: 'w-[140px]',
      cell: (r) => r.supplierName?.trim() || '—',
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
      kind: 'badge',
      header: 'Estado',
      sortable: true,
      sortKey: 'status',
      className: 'w-[120px]',
      label: (r) => r.status,
      variant: (r) => expenseStatusVariant(r.status),
    },
    {
      kind: 'text',
      header: 'Método de pago',
      sortable: true,
      sortKey: 'paymentMethod',
      defaultHidden: true,
      className: 'w-[130px]',
      cell: (r) => r.paymentMethod || '—',
    },
    {
      kind: 'text',
      header: 'Moneda',
      sortable: true,
      defaultHidden: true,
      className: 'w-[80px]',
      cell: (r) => r.currency || 'CLP',
    },
    {
      kind: 'text',
      header: 'Préstamo socio',
      defaultHidden: true,
      className: 'w-[120px]',
      cell: (r) =>
        r.isPartnerLoan
          ? r.partnerLoanReturned
            ? 'Devuelto'
            : r.partnerName?.trim() || 'Pendiente'
          : '—',
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
