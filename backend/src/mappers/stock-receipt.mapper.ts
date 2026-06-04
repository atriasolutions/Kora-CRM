import type {
  StockReceiptDetail,
  StockReceiptLineItem,
  StockReceiptListItem,
} from '../types/stock-receipt.js'
import { formatActivityLabel, formatDateLabel, toIsoString } from '../utils/format.js'

export type StockReceiptRow = {
  id: string
  number: string
  status: StockReceiptListItem['status']
  external_reference: string | null
  purchase_id: string | null
  purchase_reference: string
  supplier_name: string
  warehouse_id: string | null
  warehouse_name: string
  product_summary: string | null
  line_count: number
  confirmed_at: Date | null
  owner_name: string | null
  created_at: Date
  created_by_id: string | null
  created_by_name: string | null
  updated_at: Date
  updated_by_id: string | null
  updated_by_name: string | null
}

export type StockReceiptLineRow = {
  id: string
  receipt_id: string
  product_id: string | null
  product_name: string
  sku: string
  quantity: string | number
  sort_order: number
}

export function mapStockReceiptRow(row: StockReceiptRow): StockReceiptListItem {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    externalReference: row.external_reference ?? '',
    purchaseId: row.purchase_id ?? undefined,
    purchaseReference: row.purchase_reference || undefined,
    supplier: row.supplier_name || undefined,
    warehouse: row.warehouse_name,
    productSummary: row.product_summary ?? '',
    lineCount: row.line_count,
    createdAt: formatDateLabel(row.created_at),
    confirmedAt: row.confirmed_at ? formatDateLabel(row.confirmed_at) : undefined,
    owner: row.owner_name ?? '',
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name ?? '',
    updatedAt: toIsoString(row.updated_at),
    updatedById: row.updated_by_id ?? '',
    updatedByName: row.updated_by_name ?? '',
  }
}

export function mapStockReceiptLineRow(row: StockReceiptLineRow): StockReceiptLineItem {
  return {
    id: row.id,
    productId: row.product_id ?? undefined,
    product: row.product_name,
    sku: row.sku,
    quantity: Number(row.quantity ?? 0),
  }
}

export function mapStockReceiptDetail(
  row: StockReceiptRow,
  lines: StockReceiptLineRow[],
): StockReceiptDetail {
  return {
    ...mapStockReceiptRow(row),
    warehouseId: row.warehouse_id ?? undefined,
    lineItems: lines.map(mapStockReceiptLineRow),
  }
}

export function formatMovementWhen(at: Date | string): string {
  return formatActivityLabel(at)
}
