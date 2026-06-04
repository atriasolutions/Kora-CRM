import type { StockReceiptLineItem } from '@/data/stock-receipt-detail.mock'
import type { ProductListItem } from '@/data/products.mock'
import type { PurchaseLineItem } from '@/data/purchase-detail.mock'
import { isCatalogStockLine } from '@/lib/purchase-line-item'
import { pendingWarehouseQtyForPurchaseLine } from '@/lib/purchase-inbound-stock'
import { findLinkedProduct, getAllKnownProducts } from '@/lib/product-lookup'

export function defaultStockReceiptLineItem(
  id = `srli-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
): StockReceiptLineItem {
  return {
    id,
    sku: '',
    product: '',
    productId: undefined,
    quantity: 1,
  }
}

export function stockReceiptLineFromProduct(
  product: ProductListItem,
  lineId: string,
): StockReceiptLineItem {
  return {
    id: lineId,
    productId: product.id,
    product: product.name,
    sku: product.sku,
    quantity: 1,
  }
}

export function enrichStockReceiptLineFromCatalog(
  line: StockReceiptLineItem,
  products = getAllKnownProducts(),
): StockReceiptLineItem {
  const linked = findLinkedProduct(products, {
    id: line.productId,
    name: line.product,
    sku: line.sku,
  })
  if (!linked) return line
  return {
    ...line,
    productId: linked.id,
    product: linked.name,
    sku: linked.sku,
  }
}

/** Solo productos del catálogo; excluye servicios/flete manuales de la OC. */
export function stockReceiptLinesFromPurchase(
  purchaseId: string,
  lineItems: PurchaseLineItem[],
): StockReceiptLineItem[] {
  const products = getAllKnownProducts()

  return lineItems
    .filter((li) => isCatalogStockLine(li, products))
    .map((li) => {
      const pending = pendingWarehouseQtyForPurchaseLine(purchaseId, li)
      const draft: StockReceiptLineItem = {
        id: `srli-${li.id}`,
        productId: li.productId,
        product: li.product,
        sku: li.sku?.trim() ?? '',
        quantity: pending > 0 ? pending : li.quantity || 1,
      }
      return enrichStockReceiptLineFromCatalog(draft, products)
    })
    .filter((li) => li.sku && li.quantity > 0)
}

export function productSummaryFromReceiptLines(
  lineItems: StockReceiptLineItem[],
): string {
  if (lineItems.length === 0) return 'Sin productos'
  const skus = lineItems
    .map((li) => li.sku.trim())
    .filter(Boolean)
    .slice(0, 3)
  const suffix = lineItems.length > 3 ? ` +${lineItems.length - 3}` : ''
  return skus.join(' · ') + suffix
}
