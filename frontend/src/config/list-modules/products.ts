import type { ProductListItem } from '@/data/products.mock'
import { productStatusVariant } from '@/lib/product-display'
import type { ModuleListConfig } from '@/types/list-module'

export type { ProductListItem }

export const productsListConfig: ModuleListConfig<ProductListItem> = {
  title: 'Productos',
  description: 'Catálogo con precios, unidades y medidas para cualquier rubro.',
  entityPlural: 'productos',
  newItemLabel: 'Nuevo producto',
  total: 0,
  seeds: [],
  getDetailPath: (row) => `/productos/${row.id}`,
  searchFilter: (row, q) =>
    row.name.toLowerCase().includes(q) ||
    row.sku.toLowerCase().includes(q) ||
    row.category.toLowerCase().includes(q) ||
    row.owner.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Producto',
      sortable: true,
      className: 'w-[200px]',
      title: (r) => r.name,
      subtitle: (r) => r.sku,
    },
    {
      kind: 'text',
      header: 'Categoría',
      sortable: true,
      className: 'w-[120px]',
      cell: (r) => r.category,
    },
    {
      kind: 'text',
      header: 'Tipo',
      sortable: true,
      className: 'w-[100px]',
      cell: (r) => r.productType,
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
      header: 'Precio venta',
      sortable: true,
      className: 'w-[110px]',
      cell: (r) => r.price,
      sortValue: (r) => r.priceNum,
    },
    {
      kind: 'text',
      header: 'Stock / cupos',
      sortable: true,
      className: 'w-[120px]',
      cell: (r) => r.stock,
      sortValue: (r) => (r.stockNum < 0 ? 9999 : r.stockNum),
    },
    {
      kind: 'badge',
      header: 'Estado',
      sortable: true,
      className: 'w-[110px]',
      label: (r) => r.status,
      variant: (r) => productStatusVariant(r.status),
    },
  ],
}
