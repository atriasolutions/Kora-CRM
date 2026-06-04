import type { PurchaseLineItem, PurchaseLineKind } from '@/data/purchase-detail.mock'
import type { ProductListItem } from '@/data/products.mock'
import { findLinkedProduct, getAllKnownProducts } from '@/lib/product-lookup'
import { formatMoneyCLP, parseMoneyNum } from '@/lib/product-pricing'

function parseDiscountPercent(discount: string): number {
  const n = Number.parseInt(discount.replace(/[^\d]/g, ''), 10)
  return Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, n))
}

export function purchaseLineKind(line: PurchaseLineItem): PurchaseLineKind {
  if (line.lineKind === 'manual' || line.lineKind === 'product') return line.lineKind
  if (line.productId?.trim()) return 'product'
  return 'manual'
}

export function isManualPurchaseLine(line: PurchaseLineItem): boolean {
  return purchaseLineKind(line) === 'manual'
}

/** Línea de producto del catálogo con SKU reconocido en el sistema. */
export function isCatalogStockLine(
  line: PurchaseLineItem,
  products = getAllKnownProducts(),
): boolean {
  if (isManualPurchaseLine(line)) return false
  if (!line.productId?.trim()) return false
  const sku = line.sku?.trim() ?? ''
  if (!sku) return false
  return Boolean(
    findLinkedProduct(products, {
      id: line.productId,
      sku,
      name: line.product,
    }),
  )
}

export function recalcPurchaseLine(li: PurchaseLineItem): PurchaseLineItem {
  const unitNum = parseMoneyNum(li.unitPrice)
  const qty = Math.max(1, li.quantity)
  const gross = unitNum * qty
  const pct = parseDiscountPercent(li.discount)
  const net = Math.round(gross * (1 - pct / 100))
  return {
    ...li,
    lineKind: purchaseLineKind(li),
    quantity: qty,
    quantityReceived: 0,
    total: formatMoneyCLP(net),
  }
}

export function purchaseLineDescription(line: PurchaseLineItem): string {
  return line.description?.trim() || line.product.trim()
}

export function defaultPurchaseLineItem(
  id = `li-${Date.now()}`,
  kind: PurchaseLineKind = 'product',
): PurchaseLineItem {
  return recalcPurchaseLine({
    id,
    lineKind: kind,
    productId: kind === 'product' ? '' : undefined,
    product: '',
    description: '',
    sku: kind === 'product' ? '' : undefined,
    unitOfMeasure: 'unidad',
    customUnit: '',
    quantity: 1,
    quantityReceived: 0,
    unitPrice: '$0',
    discount: '0%',
    total: '$0',
  })
}

export function defaultManualPurchaseLineItem(id = `li-${Date.now()}`): PurchaseLineItem {
  return defaultPurchaseLineItem(id, 'manual')
}

export function purchaseCostPriceFromProduct(product: ProductListItem): string {
  if (product.costPriceNum > 0) return formatMoneyCLP(product.costPriceNum)
  const parsed = parseMoneyNum(product.costPrice)
  return parsed > 0 ? formatMoneyCLP(parsed) : '$0'
}

export function purchaseLineFromProduct(
  product: ProductListItem,
  lineId: string,
): PurchaseLineItem {
  return recalcPurchaseLine({
    id: lineId,
    lineKind: 'product',
    productId: product.id,
    product: product.name,
    description: product.name,
    sku: product.sku,
    unitOfMeasure: product.unitOfMeasure,
    customUnit: product.customUnit ?? '',
    quantity: 1,
    quantityReceived: 0,
    unitPrice: purchaseCostPriceFromProduct(product),
    discount: '0%',
    total: '$0',
  })
}

export function purchaseLineFromManualText(
  lineId: string,
  description: string,
): PurchaseLineItem {
  const text = description.trim()
  return recalcPurchaseLine({
    id: lineId,
    lineKind: 'manual',
    product: text,
    description: text,
    quantity: 1,
    quantityReceived: 0,
    unitPrice: '$0',
    discount: '0%',
    total: '$0',
  })
}

export function purchaseOrderTotals(lineItems: PurchaseLineItem[]) {
  const quantityOrdered = lineItems.reduce(
    (sum, li) => sum + Math.max(0, li.quantity || 0),
    0,
  )
  const amountNum = lineItems.reduce(
    (sum, li) => sum + parseMoneyNum(li.total),
    0,
  )
  return { quantityOrdered, amountNum, lineCount: lineItems.length }
}
