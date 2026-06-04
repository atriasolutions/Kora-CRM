import type { StockReceiptLineItem } from '@/data/stock-receipt-detail.mock'

let linesByReceiptId: Record<string, StockReceiptLineItem[]> = {}

export const STOCK_RECEIPT_LINES_SYNC_EVENT = 'kora:stock-receipt-lines-sync'

export function syncRegistryStockReceiptLines(
  entries: Record<string, StockReceiptLineItem[]>,
) {
  linesByReceiptId = { ...linesByReceiptId, ...entries }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STOCK_RECEIPT_LINES_SYNC_EVENT))
  }
}

export function getRegistryStockReceiptLines(
  receiptId: string,
): StockReceiptLineItem[] | undefined {
  return linesByReceiptId[receiptId]
}

export function clearRegistryStockReceiptLines() {
  linesByReceiptId = {}
}

export function removeRegistryStockReceiptLines(receiptId: string) {
  const id = receiptId.trim()
  if (!id || !linesByReceiptId[id]) return
  const next = { ...linesByReceiptId }
  delete next[id]
  linesByReceiptId = next
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STOCK_RECEIPT_LINES_SYNC_EVENT))
  }
}
