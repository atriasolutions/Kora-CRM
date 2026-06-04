import { getInvoiceDetail } from '@/data/invoice-detail.mock'
import { getAllKnownInvoices } from '@/data/invoices-registry-store'
import type { InvoiceListItem } from '@/data/invoices.mock'
import type { PurchaseLineItem } from '@/data/purchase-detail.mock'
import type { PurchaseListItem } from '@/data/purchases.mock'
import {
  getAllRegistryPurchases,
  getRegistryPurchaseLines,
} from '@/data/purchases-registry-store'
import type { ProductDetail } from '@/data/product-detail.mock'
import { getStockReceiptDetail } from '@/data/stock-receipt-detail.mock'
import { getAllRegistryStockReceipts } from '@/data/stock-receipts-registry-store'
import type { StockReceiptListItem } from '@/data/stock-receipts.mock'
import type { InventoryListItem } from '@/data/inventory.mock'
import { getAllInventoryRows } from '@/lib/stock-service'
import { normalizeSku } from '@/lib/stock-sku'

function norm(value: string): string {
  return value.trim().toLowerCase()
}

export type ProductRelationLine = {
  productId?: string
  sku?: string
  product?: string
  description?: string
}

function lineLabel(line: ProductRelationLine): string {
  return (line.product ?? line.description ?? '').trim()
}

export function lineMatchesProduct(
  line: ProductRelationLine,
  product: Pick<ProductDetail, 'id' | 'sku' | 'name'>,
): boolean {
  if (product.id && line.productId?.trim() === product.id) return true
  const sku = norm(product.sku)
  const lineSku = norm(line.sku ?? '')
  if (sku && lineSku && lineSku === sku) return true
  const name = norm(product.name)
  const lineName = norm(lineLabel(line))
  if (!name || !lineName) return false
  if (lineName === name) return true
  if (lineName.includes(name) || name.includes(lineName)) return true
  return false
}

function summaryMatchesProduct(
  summary: string,
  product: Pick<ProductDetail, 'sku' | 'name'>,
): boolean {
  const text = norm(summary)
  const sku = norm(product.sku)
  const name = norm(product.name)
  if (sku && text.includes(sku)) return true
  if (name && text.includes(name)) return true
  if (name.length > 4) {
    const firstWord = name.split(/\s+/)[0]
    if (firstWord && firstWord.length > 3 && text.includes(firstWord)) return true
  }
  return false
}

export function inventoryRowsForProduct(
  product: Pick<ProductDetail, 'sku'>,
  rows: InventoryListItem[] = getAllInventoryRows(),
): InventoryListItem[] {
  const key = normalizeSku(product.sku)
  if (!key) return []
  return rows.filter((row) => normalizeSku(row.sku) === key)
}

export function purchasesForProduct(
  product: Pick<ProductDetail, 'id' | 'sku' | 'name'>,
  purchases: PurchaseListItem[] = getAllRegistryPurchases(),
): PurchaseListItem[] {
  return purchases.filter((pur) => {
    if (summaryMatchesProduct(pur.productSummary, product)) return true
    const lines = getRegistryPurchaseLines(pur.id)
    return lines?.some((li) => lineMatchesProduct(li, product)) ?? false
  })
}

export function purchaseLinesForProduct(
  product: Pick<ProductDetail, 'id' | 'sku' | 'name'>,
  lineItems: PurchaseLineItem[],
): PurchaseLineItem[] {
  return lineItems.filter((li) => lineMatchesProduct(li, product))
}

export function invoicesForProduct(
  product: Pick<ProductDetail, 'id' | 'sku' | 'name'>,
  invoices: InvoiceListItem[] = getAllKnownInvoices(),
): InvoiceListItem[] {
  return invoices.filter((inv) => {
    try {
      const detail = getInvoiceDetail(inv.id)
      return detail.lineItems.some((li) => lineMatchesProduct(li, product))
    } catch {
      return false
    }
  })
}

export function stockReceiptsForProduct(
  product: Pick<ProductDetail, 'id' | 'sku' | 'name'>,
  receipts: StockReceiptListItem[] = getAllRegistryStockReceipts(),
): StockReceiptListItem[] {
  return receipts.filter((receipt) => {
    if (summaryMatchesProduct(receipt.productSummary, product)) return true
    try {
      const detail = getStockReceiptDetail(receipt.id)
      return detail.lineItems.some((li) => lineMatchesProduct(li, product))
    } catch {
      return false
    }
  })
}

export type ProductRelationCounts = {
  inventory: number
  ingresos: number
  compras: number
  facturas: number
}

export function productRelationCounts(
  product: ProductDetail,
): ProductRelationCounts {
  return {
    inventory: inventoryRowsForProduct(product).length,
    ingresos: stockReceiptsForProduct(product).length,
    compras: purchasesForProduct(product).length,
    facturas: invoicesForProduct(product).length,
  }
}
