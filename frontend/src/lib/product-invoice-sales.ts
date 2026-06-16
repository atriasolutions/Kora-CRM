import { isApiEnabled } from '@/api/config'
import { fetchProductInvoiceSalesTotalsApi } from '@/api/products'
import { getInvoiceDetail } from '@/data/invoice-detail.mock'
import { getAllKnownInvoices } from '@/data/invoices-registry-store'
import type { InvoiceLineItem } from '@/data/invoice-detail.mock'
import type { ProductListItem } from '@/data/products.mock'
import { normalizeSku } from '@/lib/stock-sku'

export type ProductInvoiceSalesTotals = {
  byProductId: Map<string, number>
  bySku: Map<string, number>
}

export const PRODUCT_SALES_SEGMENT_LIMIT = 30

/** Factura emitida: excluye borrador y anulada. */
export function isIssuedInvoiceStatus(status: string): boolean {
  const s = status.trim()
  return s !== 'Borrador' && s !== 'Anulada'
}

function addLineQuantity(
  totals: ProductInvoiceSalesTotals,
  line: Pick<InvoiceLineItem, 'productId' | 'sku' | 'quantity'>,
): void {
  const qty = Number(line.quantity)
  if (!Number.isFinite(qty) || qty <= 0) return

  const productId = line.productId?.trim()
  if (productId) {
    totals.byProductId.set(productId, (totals.byProductId.get(productId) ?? 0) + qty)
  } else {
    const skuKey = normalizeSku(line.sku ?? '')
    if (skuKey) {
      totals.bySku.set(skuKey, (totals.bySku.get(skuKey) ?? 0) + qty)
    }
  }
}

function emptyTotals(): ProductInvoiceSalesTotals {
  return { byProductId: new Map(), bySku: new Map() }
}

function aggregateFromInvoiceDetails(
  invoices: { id: string; status: string }[],
  loadDetail: (id: string) => { lineItems: InvoiceLineItem[] },
): ProductInvoiceSalesTotals {
  const totals = emptyTotals()
  for (const inv of invoices) {
    if (!isIssuedInvoiceStatus(inv.status)) continue
    try {
      const detail = loadDetail(inv.id)
      for (const line of detail.lineItems ?? []) {
        addLineQuantity(totals, line)
      }
    } catch {
      /* omitir facturas sin detalle */
    }
  }
  return totals
}

export function loadProductInvoiceSalesTotalsLocal(): ProductInvoiceSalesTotals {
  return aggregateFromInvoiceDetails(getAllKnownInvoices(), getInvoiceDetail)
}

export async function loadProductInvoiceSalesTotals(): Promise<ProductInvoiceSalesTotals> {
  if (isApiEnabled()) {
    const rows = await fetchProductInvoiceSalesTotalsApi()
    const totals = emptyTotals()
    for (const row of rows) {
      const qty = row.totalQuantity
      if (!Number.isFinite(qty) || qty <= 0) continue
      if (row.productId?.trim()) {
        totals.byProductId.set(row.productId, qty)
      } else {
        const skuKey = normalizeSku(row.sku ?? '')
        if (skuKey) {
          totals.bySku.set(skuKey, qty)
        }
      }
    }
    return totals
  }
  return loadProductInvoiceSalesTotalsLocal()
}

/** Cantidad total facturada (unidades en líneas) para un producto del catálogo. */
export function productInvoicedQuantity(
  product: Pick<ProductListItem, 'id' | 'sku'>,
  totals: ProductInvoiceSalesTotals,
): number {
  const byId = totals.byProductId.get(product.id) ?? 0
  const skuKey = normalizeSku(product.sku)
  const bySku = skuKey ? (totals.bySku.get(skuKey) ?? 0) : 0
  return Math.max(byId, bySku)
}

export function formatInvoicedQuantityLabel(qty: number): string {
  const n = Math.round(qty * 1000) / 1000
  if (n === 0) return '0 u. facturadas'
  const label = Number.isInteger(n) ? String(n) : n.toLocaleString('es-CL', { maximumFractionDigits: 2 })
  return `${label} u. en facturas emitidas`
}

export type ProductWithInvoicedQty = ProductListItem & { invoicedQty: number; salesRank?: number }

function rankAllWithSales(
  products: ProductListItem[],
  totals: ProductInvoiceSalesTotals,
): ProductWithInvoicedQty[] {
  return products
    .map((product) => ({
      ...product,
      invoicedQty: productInvoicedQuantity(product, totals),
    }))
    .filter((row) => row.invoicedQty > 0)
    .sort((a, b) => b.invoicedQty - a.invoicedQty)
}

export function buildTopPurchasedSegmentItems(
  products: ProductListItem[],
  totals: ProductInvoiceSalesTotals,
  limit = PRODUCT_SALES_SEGMENT_LIMIT,
): ProductWithInvoicedQty[] {
  return rankAllWithSales(products, totals)
    .slice(0, limit)
    .map((row, index) => ({ ...row, salesRank: index + 1 }))
}

export function buildBottomPurchasedSegmentItems(
  products: ProductListItem[],
  totals: ProductInvoiceSalesTotals,
  limit = PRODUCT_SALES_SEGMENT_LIMIT,
): ProductWithInvoicedQty[] {
  const topIds = new Set(
    buildTopPurchasedSegmentItems(products, totals, limit).map((row) => row.id),
  )
  const bottom = rankAllWithSales(products, totals)
    .filter((row) => !topIds.has(row.id))
    .slice(-limit)
    .reverse()
  return bottom.map((row, index) => ({ ...row, salesRank: index + 1 }))
}

export function buildSalesRankedSegmentItems(
  products: ProductListItem[],
  totals: ProductInvoiceSalesTotals,
  salesRank: 'top' | 'bottom',
): ProductWithInvoicedQty[] {
  return salesRank === 'top'
    ? buildTopPurchasedSegmentItems(products, totals)
    : buildBottomPurchasedSegmentItems(products, totals)
}

export function countSalesRankedSegment(
  products: ProductListItem[],
  totals: ProductInvoiceSalesTotals,
  salesRank: 'top' | 'bottom',
): number {
  return buildSalesRankedSegmentItems(products, totals, salesRank).length
}

export function countProductsWithInvoicedSales(
  products: ProductListItem[],
  totals: ProductInvoiceSalesTotals,
): number {
  return products.filter((p) => productInvoicedQuantity(p, totals) > 0).length
}
