import type { ProductListItem } from '@/data/products.mock'
import { formatStockDisplay } from '@/lib/product-display'
import { getAllInventoryRows } from '@/lib/stock-service'
import { normalizeSku } from '@/lib/stock-sku'

/** Suma existencias en bodega por SKU (misma lógica que la vista Inventario). */
export function onHandQtyBySkuFromInventory(): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of getAllInventoryRows()) {
    const sku = row.sku?.trim()
    if (!sku) continue
    const key = normalizeSku(sku)
    const qty = row.onHandQtyNum ?? row.quantityNum ?? 0
    map.set(key, (map.get(key) ?? 0) + Math.max(0, qty))
  }
  return map
}

/** Alinea stock del catálogo con inventario cuando el producto controla existencias. */
export function enrichProductListItemStock(
  product: ProductListItem,
  onHandBySku = onHandQtyBySkuFromInventory(),
): ProductListItem {
  if (!product.sku.trim()) return product
  if (product.stockNum < 0) return product

  const onHand = onHandBySku.get(normalizeSku(product.sku))
  if (onHand == null) return product

  const stockNum = Math.floor(onHand)
  return {
    ...product,
    stockNum,
    stock: formatStockDisplay(stockNum, `${stockNum} ${product.unitOfMeasure || 'ud'}`),
  }
}

export function enrichProductListStock(
  products: ProductListItem[],
): ProductListItem[] {
  const onHandBySku = onHandQtyBySkuFromInventory()
  return products.map((p) => enrichProductListItemStock(p, onHandBySku))
}
