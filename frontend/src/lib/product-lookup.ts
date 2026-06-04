import { getRegistryProducts } from '@/data/products-registry-store'
import type { ProductListItem } from '@/data/products.mock'

export function getAllKnownProducts(): ProductListItem[] {
  return getRegistryProducts()
}

export type ProductLookupRef = {
  id?: string
  name?: string
  sku?: string
}

export function findProductById(
  products: ProductListItem[],
  productId: string,
): ProductListItem | undefined {
  if (!productId.trim()) return undefined
  return products.find((p) => p.id === productId)
}

export function findProductBySku(
  products: ProductListItem[],
  sku: string,
): ProductListItem | undefined {
  const key = sku.trim().toLowerCase()
  if (!key) return undefined
  return products.find((p) => p.sku.trim().toLowerCase() === key)
}

export function findLinkedProduct(
  products: ProductListItem[],
  lookup: ProductLookupRef,
): ProductListItem | undefined {
  const id = lookup.id?.trim()
  if (id) {
    const byId = findProductById(products, id)
    if (byId) return byId
  }

  const sku = lookup.sku?.trim()
  if (sku) {
    const bySku = findProductBySku(products, sku)
    if (bySku) return bySku
  }

  const nameNorm = lookup.name?.trim().toLowerCase()
  if (nameNorm) {
    return products.find((p) => p.name.trim().toLowerCase() === nameNorm)
  }

  return undefined
}

export function searchProducts(
  products: ProductListItem[],
  query: string,
  options?: { limit?: number; activeOnly?: boolean },
): ProductListItem[] {
  const limit = options?.limit ?? 10
  let pool = products
  if (options?.activeOnly !== false) {
    pool = pool.filter((p) => p.status !== 'Borrador')
  }

  const q = query.trim().toLowerCase()
  if (!q) {
    return [...pool]
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .slice(0, limit)
  }

  return pool
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.barcode?.toLowerCase().includes(q) ?? false),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .slice(0, limit)
}
