import { STORAGE_PREFIX } from '@/config/brand'
import { isLocalDetailStorageActive } from '@/lib/local-detail-storage'
import type { ContactNote } from '@/data/contact-detail.mock'
import type { StockReceiptLineItem } from '@/data/stock-receipt-detail.mock'
import type { StockReceiptDetail } from '@/data/stock-receipt-detail.mock'
import { stockReceiptNotesFromStorage } from '@/lib/stock-receipt-notes'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-stock-receipt-details`

export type StockReceiptDetailOverride = {
  lineItems?: StockReceiptLineItem[]
  /** Notas del panel (rich text). En storage antiguo puede ser string. */
  notes?: ContactNote[] | string
  /** Observaciones del formulario de ingreso (texto libre). */
  memo?: string
  externalReference?: string
  warehouseId?: string
  warehouse?: string
  purchaseId?: string
  purchaseReference?: string
  supplier?: string
  status?: StockReceiptDetail['status']
  confirmedAt?: string
}

function readAll(): Record<string, StockReceiptDetailOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, StockReceiptDetailOverride>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, StockReceiptDetailOverride>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* quota */
  }
}

export function loadStockReceiptDetailOverride(
  receiptId: string,
): StockReceiptDetailOverride | null {
  if (!isLocalDetailStorageActive()) return null
  return readAll()[receiptId] ?? null
}

export function persistStockReceiptDetailOverride(
  receiptId: string,
  override: StockReceiptDetailOverride,
) {
  if (!isLocalDetailStorageActive()) return
  const all = readAll()
  all[receiptId] = { ...all[receiptId], ...override }
  writeAll(all)
}

export function mergeStockReceiptDetailOverride(
  detail: StockReceiptDetail,
  override: StockReceiptDetailOverride | null,
): StockReceiptDetail {
  if (!override) return detail
  const overrideNotes = override.notes
  return {
    ...detail,
    memo: override.memo ?? detail.memo,
    externalReference: override.externalReference ?? detail.externalReference,
    warehouseId: override.warehouseId ?? detail.warehouseId,
    warehouse: override.warehouse ?? detail.warehouse,
    purchaseId: override.purchaseId ?? detail.purchaseId,
    purchaseReference: override.purchaseReference ?? detail.purchaseReference,
    supplier: override.supplier ?? detail.supplier,
    status: override.status ?? detail.status,
    confirmedAt: override.confirmedAt ?? detail.confirmedAt,
    lineItems: override.lineItems ?? detail.lineItems,
    notes:
      overrideNotes !== undefined
        ? stockReceiptNotesFromStorage(overrideNotes, detail.owner, detail.id)
        : detail.notes,
  }
}

export function removeStockReceiptDetailOverride(receiptId: string) {
  const all = readAll()
  if (!all[receiptId]) return
  delete all[receiptId]
  writeAll(all)
}
