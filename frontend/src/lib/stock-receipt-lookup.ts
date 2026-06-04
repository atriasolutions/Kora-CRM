import type { StockReceiptListItem } from '@/data/stock-receipts.mock'

export function findStockReceiptById(
  receipts: StockReceiptListItem[],
  id: string,
): StockReceiptListItem | undefined {
  const trimmed = id.trim()
  if (!trimmed) return undefined
  return receipts.find((r) => r.id === trimmed)
}

export function searchStockReceipts(
  receipts: StockReceiptListItem[],
  query: string,
  limit = 12,
): StockReceiptListItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return receipts.slice(0, limit)
  return receipts
    .filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        (r.supplier?.toLowerCase().includes(q) ?? false) ||
        r.productSummary.toLowerCase().includes(q) ||
        (r.purchaseReference?.toLowerCase().includes(q) ?? false),
    )
    .slice(0, limit)
}
