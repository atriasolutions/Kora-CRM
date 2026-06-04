import { isApiEnabled } from '@/api/config'
import type { InventoryDetail } from '@/data/inventory-detail.mock'
import { getRegistryProducts } from '@/data/products-registry-store'
import { productForInventorySku } from '@/lib/inventory-relations'

/** Completa categoría y responsable desde el catálogo de productos si faltan en inventario. */
export function mergeInventoryDetailFromProduct(
  detail: InventoryDetail,
): InventoryDetail {
  const hasCategory = Boolean(detail.category?.trim())
  const hasOwner = Boolean(detail.owner?.trim() && detail.owner !== '—')
  if (hasCategory && hasOwner) return detail

  const product = productForInventorySku(getRegistryProducts(), detail.sku)
  if (!product) return detail

  return {
    ...detail,
    category: hasCategory ? detail.category : product.category,
    owner: hasOwner ? detail.owner : product.owner,
    unitCost: detail.unitCost?.trim() ? detail.unitCost : product.costPrice,
  }
}

export function enrichInventoryDetailIfNeeded(detail: InventoryDetail): InventoryDetail {
  if (!isApiEnabled()) return detail
  return mergeInventoryDetailFromProduct(detail)
}
