import { purgeEntityAttachments } from '@/lib/entity-attachments-purge'
import { removeRegistryStockReceiptLines } from '@/data/stock-receipt-lines-registry-store'
import { removeStockReceiptDetailOverride } from '@/lib/stock-receipt-detail-storage'

/** Limpia overrides locales del ingreso (no reversible). */
export function purgeStockReceiptLocalData(receiptId: string) {
  const id = receiptId.trim()
  if (!id) return
  purgeEntityAttachments('recepcion', id)
  removeStockReceiptDetailOverride(id)
  removeRegistryStockReceiptLines(id)
}
