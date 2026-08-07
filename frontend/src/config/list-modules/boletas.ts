import type { BoletaListItem } from '@/data/boletas.mock'
import {
  boletaListStatusLabel,
  boletaStatusVariant,
  resolveBoletaListStage,
} from '@/lib/boleta-display'
import type { ModuleListConfig } from '@/types/list-module'

export type { BoletaListItem }

export const boletasListConfig: ModuleListConfig<BoletaListItem> = {
  title: 'Boletas',
  description: 'Boletas de venta emitidas y borradores.',
  entityPlural: 'boletas',
  newItemLabel: 'Nueva boleta',
  total: 0,
  seeds: [],
  minTableWidth: '900px',
  getDetailPath: (row) => `/boletas/${row.id}`,
  searchFilter: (row, q) =>
    row.number.toLowerCase().includes(q) ||
    row.buyerName.toLowerCase().includes(q) ||
    row.owner.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Documento',
      sortable: true,
      sortKey: 'number',
      className: 'w-[180px]',
      title: (r) => r.number,
      subtitle: () => 'Boleta',
    },
    {
      kind: 'text',
      header: 'Comprador',
      sortable: true,
      sortKey: 'buyerName',
      className: 'w-[160px]',
      cell: (r) => r.buyerName,
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
      label: (r) => boletaListStatusLabel(r),
      variant: (r) => boletaStatusVariant(resolveBoletaListStage(r)),
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
