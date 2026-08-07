import type { InvoiceListItem } from '@/data/invoices.mock'
import {
  invoiceListStatusLabel,
  invoiceStatusVariant,
  resolveInvoiceListStage,
} from '@/lib/invoice-display'
import {
  documentKindLabel,
  dteTypeLabel,
} from '@/lib/invoice-dte'
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
      header: 'Documento',
      sortable: true,
      sortKey: 'number',
      className: 'w-[180px]',
      title: (r) => r.number,
      subtitle: (r) => documentKindLabel(r.documentKind),
    },
    {
      kind: 'text',
      header: 'Folio SII',
      sortable: false,
      defaultHidden: true,
      className: 'w-[100px]',
      cell: (r) =>
        r.siiNumber
          ? r.siiNumber
          : r.documentKind === 'invoice'
            ? dteTypeLabel(undefined, r.documentKind)
            : '—',
    },
    {
      kind: 'text',
      header: 'Cliente',
      sortable: true,
      sortKey: 'client',
      className: 'w-[150px]',
      cell: (r) => r.client,
    },
    {
      kind: 'text',
      header: 'Monto',
      sortable: true,
      sortKey: 'amount',
      className: 'w-[110px]',
      cell: (r) => r.amount,
      sortValue: (r) => r.amountNum,
    },
    {
      kind: 'text',
      header: 'Emisión',
      sortable: true,
      sortKey: 'issueDate',
      className: 'w-[120px]',
      cell: (r) => r.issueDate,
    },
    {
      kind: 'text',
      header: 'Vencimiento',
      sortable: true,
      sortKey: 'dueDate',
      className: 'w-[120px]',
      cell: (r) => r.dueDate,
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
      label: (r) => invoiceListStatusLabel(r),
      variant: (r) => invoiceStatusVariant(resolveInvoiceListStage(r)),
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
