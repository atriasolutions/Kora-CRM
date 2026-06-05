import type { ProductListItem } from '@/data/products.mock'
import { normalizeSku } from '@/lib/stock-sku'

export type ProductSkuRecord = Pick<ProductListItem, 'id' | 'sku' | 'name'>

export function findDuplicateProductBySku(
  sku: string,
  candidates: Iterable<ProductSkuRecord>,
  excludeId?: string,
): ProductSkuRecord | null {
  const key = normalizeSku(sku)
  if (!key) return null
  for (const product of candidates) {
    if (excludeId && product.id === excludeId) continue
    if (normalizeSku(product.sku) === key) return product
  }
  return null
}

export function productSkuDuplicateMessage(
  sku: string,
  duplicate: ProductSkuRecord,
): string {
  const label = sku.trim()
  const name = duplicate.name?.trim()
  return name
    ? `Ya existe un producto con el SKU «${label}» (${name}).`
    : `Ya existe un producto con el SKU «${label}».`
}

export function assertProductSkuAvailable(
  sku: string,
  candidates: Iterable<ProductSkuRecord>,
  excludeId?: string,
): void {
  const duplicate = findDuplicateProductBySku(sku, candidates, excludeId)
  if (duplicate) {
    throw new Error(productSkuDuplicateMessage(sku, duplicate))
  }
}
