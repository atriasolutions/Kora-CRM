import type { InventoryListItem } from '@/data/inventory.mock'
import { inventoryStatusVariant } from '@/lib/inventory-display'
import type { ModuleListConfig } from '@/types/list-module'

export type { InventoryListItem }

export const inventoryListConfig: ModuleListConfig<InventoryListItem> = {
  title: 'Inventario',
  description: 'Existencias consolidadas por producto (SKU).',
  entityPlural: 'registros',
  newItemLabel: 'Nuevo movimiento',
  total: 0,
  seeds: [],
  minTableWidth: '1050px',
  getDetailPath: (row) =>
    `/inventario/sku-${encodeURIComponent(row.sku.toLowerCase())}`,
  searchFilter: (row, q) =>
    row.productName.toLowerCase().includes(q) || row.sku.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Producto',
      sortable: true,
      className: 'w-[200px]',
      title: (r) => r.productName,
      subtitle: (r) => r.sku,
    },
    {
      kind: 'text',
      header: 'Ubicación',
      sortable: true,
      className: 'w-[140px]',
      cell: (r) => r.location,
    },
    {
      kind: 'text',
      header: 'En bodega',
      sortable: true,
      className: 'w-[100px]',
      cell: (r) => r.quantity,
      sortValue: (r) => r.onHandQtyNum ?? r.quantityNum,
    },
    {
      kind: 'text',
      header: 'Reservado',
      sortable: true,
      className: 'w-[90px]',
      cell: (r) => String(r.reservedQtyNum ?? 0),
      sortValue: (r) => r.reservedQtyNum ?? 0,
    },
    {
      kind: 'text',
      header: 'Disponible',
      sortable: true,
      className: 'w-[100px]',
      cell: (r) => String(r.availableQtyNum ?? r.quantityNum),
      sortValue: (r) => r.availableQtyNum ?? r.quantityNum,
    },
    {
      kind: 'text',
      header: 'Mínimo',
      sortable: true,
      className: 'w-[100px]',
      cell: (r) => r.minStock,
      sortValue: (r) => r.minStockNum,
    },
    {
      kind: 'text',
      header: 'Último movimiento',
      sortable: true,
      className: 'w-[180px]',
      cell: (r) => r.lastMovement,
    },
    {
      kind: 'badge',
      header: 'Estado',
      sortable: true,
      className: 'w-[120px]',
      label: (r) => r.status,
      variant: (r) => inventoryStatusVariant(r.status),
    },
  ],
}
