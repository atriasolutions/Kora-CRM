import type { ProductListItem, ProductStatus } from '@/data/products.mock'
import { PRODUCT_STATUS_OPTIONS } from '@/data/products.mock'
import { PRODUCT_CATEGORY_OPTIONS } from '@/lib/product-catalog'

export type ProductStockFilter = 'all' | 'low' | 'out'

export type ProductFilters = {
  statuses: ProductStatus[]
  categories: string[]
  stock: ProductStockFilter
}

export { PRODUCT_STATUS_OPTIONS, PRODUCT_CATEGORY_OPTIONS }

export const PRODUCT_STOCK_OPTIONS: {
  value: ProductStockFilter
  label: string
}[] = [
  { value: 'all', label: 'Cualquier stock' },
  { value: 'low', label: 'Stock bajo' },
  { value: 'out', label: 'Sin stock' },
]

export function createDefaultProductFilters(): ProductFilters {
  return { statuses: [], categories: [], stock: 'all' }
}

export function countActiveProductFilters(filters: ProductFilters): number {
  let n = 0
  if (filters.statuses.length > 0) n += 1
  if (filters.categories.length > 0) n += 1
  if (filters.stock !== 'all') n += 1
  return n
}

function matchesStock(row: ProductListItem, filter: ProductStockFilter): boolean {
  switch (filter) {
    case 'low':
      return row.stockNum > 0 && row.stockNum <= 12
    case 'out':
      return row.status === 'Agotado' || row.stockNum === 0
    default:
      return true
  }
}

export function productRowMatchesFilters(
  row: ProductListItem,
  filters: ProductFilters,
): boolean {
  if (filters.statuses.length > 0 && !filters.statuses.includes(row.status)) return false
  if (filters.categories.length > 0 && !filters.categories.includes(row.category)) {
    return false
  }
  if (!matchesStock(row, filters.stock)) return false
  return true
}
