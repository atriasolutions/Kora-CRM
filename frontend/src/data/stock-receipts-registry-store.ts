import type { StockReceiptListItem } from '@/data/stock-receipts.mock'

let userSnapshot: StockReceiptListItem[] = []
let archivedSnapshot: StockReceiptListItem[] = []

export function syncRegistryStockReceipts(userReceipts: StockReceiptListItem[]) {
  userSnapshot = userReceipts
}

export function syncRegistryArchivedStockReceipts(receipts: StockReceiptListItem[]) {
  archivedSnapshot = receipts
}

export function getArchivedRegistryStockReceipts(): StockReceiptListItem[] {
  return archivedSnapshot
}

export function getAllRegistryStockReceipts(): StockReceiptListItem[] {
  return userSnapshot
}

export function getRegistryStockReceiptById(
  id: string,
): StockReceiptListItem | undefined {
  return getAllRegistryStockReceipts().find((r) => r.id === id)
}

export function isUserStockReceiptId(id: string): boolean {
  return id.startsWith('stock-receipt-user-')
}
