import type { InvoiceListItem } from '@/data/invoices.mock'
import {
  invoiceListStatusLabel,
  invoiceStatusVariant,
  resolveInvoiceListStage,
} from '@/lib/invoice-display'
import type { ModuleListConfig } from '@/types/list-module'

export type { InvoiceListItem }

export const invoicingListConfig: ModuleListConfig<InvoiceListItem> = {
  title: 'Facturación',
  description: 'Facturas emitidas y cobros pendientes.',
  entityPlural: 'facturas',
  newItemLabel: 'Nueva factura',
  total: 0,
  seeds: [],
  minTableWidth: '1000px',
  getDetailPath: (row) => `/facturacion/${row.id}`,
  searchFilter: (row, q) =>
    row.number.toLowerCase().includes(q) ||
    row.client.toLowerCase().includes(q) ||
    row.owner.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Factura',
      sortable: true,
      className: 'w-[160px]',
      title: (r) => r.number,
      subtitle: (r) => r.client,
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
      header: 'Emisión',
      sortable: true,
      className: 'w-[120px]',
      cell: (r) => r.issueDate,
    },
    {
      kind: 'text',
      header: 'Vencimiento',
      sortable: true,
      className: 'w-[120px]',
      cell: (r) => r.dueDate,
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
      label: (r) => invoiceListStatusLabel(r),
      variant: (r) => invoiceStatusVariant(resolveInvoiceListStage(r)),
    },
  ],
}
