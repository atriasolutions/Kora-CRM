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
    (row.subcategory?.toLowerCase().includes(q) ?? false) ||
    row.owner.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Producto',
      sortable: true,
      sortKey: 'name',
      className: 'w-[200px]',
      title: (r) => r.name,
      subtitle: (r) =>
        (r.variantsCount ?? 0) > 0
          ? `${r.sku} · ${r.variantsCount} variedades`
          : r.sku,
    },
    {
      kind: 'text',
      header: 'SKU',
      sortable: true,
      sortKey: 'sku',
      defaultHidden: true,
      className: 'w-[120px]',
      cell: (r) => r.sku,
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
      header: 'Subcategoría',
      sortable: true,
      defaultHidden: true,
      className: 'w-[120px]',
      cell: (r) => r.subcategory ?? '—',
    },
    {
      kind: 'text',
      header: 'Tipo',
      sortable: true,
      defaultHidden: true,
      className: 'w-[100px]',
      cell: (r) => r.productType,
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
      header: 'Precio venta',
      sortable: true,
      sortKey: 'price',
      className: 'w-[110px]',
      cell: (r) => r.price,
      sortValue: (r) => r.priceNum,
    },
    {
      kind: 'text',
      header: 'Stock / cupos',
      sortable: true,
      sortKey: 'stock',
      className: 'w-[120px]',
      cell: (r) => r.stock,
      sortValue: (r) => (r.stockNum < 0 ? 9999 : r.stockNum),
    },
    {
      kind: 'badge',
      header: 'Estado',
      sortable: true,
      sortKey: 'status',
      className: 'w-[110px]',
      label: (r) => r.status,
      variant: (r) => productStatusVariant(r.status),
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
