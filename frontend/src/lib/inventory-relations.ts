import type { InventoryListItem } from '@/data/inventory.mock'
import type { ProductListItem } from '@/data/products.mock'
import type { InventoryDetail, InventoryMovementLine } from '@/data/inventory-detail.mock'
import type { PurchaseListItem } from '@/data/purchases.mock'

function norm(value: string): string {
  return value.trim().toLowerCase()
}

/** Órdenes de compra relacionadas por referencia o producto. */
export function purchasesForInventory(
  purchases: PurchaseListItem[],
  item: Pick<
    InventoryListItem,
    'productName' | 'sku' | 'lastMovement'
  > & { linkedPurchaseRef?: string },
): PurchaseListItem[] {
  const sku = norm(item.sku)
  const name = norm(item.productName)
  const linked = item.linkedPurchaseRef?.trim()

  return purchases.filter((pur) => {
    if (linked && pur.reference === linked) return true
    const summary = norm(pur.productSummary)
    if (sku && summary.includes(sku)) return true
    if (name && (summary.includes(name) || name.split(' ').some((w) => w.length > 3 && summary.includes(w)))) {
      return true
    }
    const movement = norm(item.lastMovement)
    if (movement.includes(norm(pur.reference))) return true
    return false
  })
}

/** Producto de catálogo por SKU. */
export function productForInventorySku(
  products: ProductListItem[],
  sku: string,
): ProductListItem | undefined {
  const key = norm(sku)
  return products.find((p) => norm(p.sku) === key)
}

export type InventoryRelationCounts = {
  movements: number
  purchases: number
  hasProduct: boolean
}

export function inventoryRelationCounts(
  item: InventoryDetail,
  allPurchases: PurchaseListItem[],
  allProducts: ProductListItem[],
): InventoryRelationCounts {
  return {
    movements: item.movements.length,
    purchases: purchasesForInventory(allPurchases, item).length,
    hasProduct: Boolean(productForInventorySku(allProducts, item.sku)),
  }
}

export { type InventoryMovementLine }
export type { InventoryMovementAdjustmentDetail, InventoryMovementSourceKind } from '@/lib/inventory-movement'
