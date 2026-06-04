import type { InventoryListItem } from '@/data/inventory.mock'
import type { ProductListItem } from '@/data/products.mock'
import type { PurchaseDetail, PurchaseLineItem } from '@/data/purchase-detail.mock'
import type { PurchaseListItem } from '@/data/purchases.mock'
import { getRegistryPurchaseLines } from '@/data/purchases-registry-store'
import { normalizeSku } from '@/lib/stock-sku'

function norm(value: string): string {
  return value.trim().toLowerCase()
}

/** Inventario en bodega para los SKU de las líneas de la orden. */
export function inventoryForPurchase(
  inventory: InventoryListItem[],
  purchase: Pick<PurchaseListItem, 'id' | 'reference' | 'productSummary' | 'supplier'>,
  lineItems: PurchaseLineItem[] = getRegistryPurchaseLines(purchase.id) ?? [],
): InventoryListItem[] {
  const lineSkus = new Set(
    lineItems
      .map((line) => normalizeSku(line.sku ?? ''))
      .filter((sku) => sku.length > 0),
  )

  if (lineSkus.size > 0) {
    return inventory.filter((item) => lineSkus.has(normalizeSku(item.sku)))
  }

  const ref = norm(purchase.reference)
  const summary = norm(purchase.productSummary)

  return inventory.filter((item) => {
    const movement = norm(item.lastMovement)
    const name = norm(item.productName)
    const sku = normalizeSku(item.sku)
    if (summary && sku && summary.includes(sku)) return true
    if (ref && movement.includes(ref)) return true
    if (summary && (name.includes(summary.slice(0, 12)) || summary.includes(name.slice(0, 12)))) {
      return true
    }
    return false
  })
}

/** Productos del catálogo que coinciden con líneas de la orden. */
export function productsForPurchaseLines(
  products: ProductListItem[],
  lineItems: PurchaseLineItem[],
): ProductListItem[] {
  const seen = new Set<string>()
  const result: ProductListItem[] = []

  for (const line of lineItems) {
    const key = norm(line.product)
    const match = products.find(
      (p) =>
        norm(p.name) === key ||
        norm(p.name).includes(key) ||
        key.includes(norm(p.name)) ||
        norm(p.sku).length > 0 && key.includes(norm(p.sku)),
    )
    if (match && !seen.has(match.id)) {
      seen.add(match.id)
      result.push(match)
    }
  }

  return result
}

export type PurchaseRelationCounts = {
  lineItems: number
  inventory: number
  products: number
}

export function purchaseRelationCounts(
  purchase: PurchaseDetail,
  allInventory: InventoryListItem[],
  allProducts: ProductListItem[],
): PurchaseRelationCounts {
  return {
    lineItems: purchase.lineItems.length,
    inventory: inventoryForPurchase(allInventory, purchase, purchase.lineItems).length,
    products: productsForPurchaseLines(allProducts, purchase.lineItems).length,
  }
}
