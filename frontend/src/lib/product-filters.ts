import type { ProductListItem, ProductStatus } from '@/data/products.mock'
import { PRODUCT_STATUS_OPTIONS } from '@/data/products.mock'
import { PRODUCT_CATEGORY_OPTIONS } from '@/lib/product-catalog'
import {
  createDefaultListDateFilter,
  isListDateFilterActive,
  listDateFilterToServerQuery,
  listRowMatchesDateFilter,
  type ListDateFilter,
} from '@/lib/list-date-filter'

export type ProductStockFilter = 'all' | 'low' | 'out'

export type ProductFilters = {
  statuses: ProductStatus[]
  categories: string[]
  stock: ProductStockFilter
  date: ListDateFilter
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
  return { statuses: [], categories: [], stock: 'all', date: createDefaultListDateFilter() }
}

export function countActiveProductFilters(filters: ProductFilters): number {
  let n = 0
  if (filters.statuses.length > 0) n += 1
  if (filters.categories.length > 0) n += 1
  if (filters.stock !== 'all') n += 1
  if (isListDateFilterActive(filters.date)) n += 1
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
  if (!listRowMatchesDateFilter(row.createdAt, filters.date)) return false
  return true
}

export function productFiltersToServerQuery(
  filters: ProductFilters,
  options?: { mine?: boolean; ownerName?: string },
): Record<string, string> {
  const query: Record<string, string> = {
    ...listDateFilterToServerQuery(filters.date),
  }
  if (filters.statuses.length > 0) {
    query.status = filters.statuses.join(',')
  }
  if (filters.categories.length > 0) {
    query.category = filters.categories.join(',')
  }
  if (filters.stock !== 'all') {
    query.stock = filters.stock
  }
  if (options?.mine && options.ownerName?.trim()) {
    query.ownerName = options.ownerName.trim()
  }
  return query
}
