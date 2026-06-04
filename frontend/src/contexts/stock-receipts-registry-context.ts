import { createContext } from 'react'

import type { StockReceiptDetail } from '@/data/stock-receipt-detail.mock'
import type { StockReceiptListItem } from '@/data/stock-receipts.mock'
import type { StockReceiptFormValues } from '@/lib/stock-receipt-form'
import type { ArchivedStockReceiptRecord } from '@/lib/stock-receipt-archive'

export type ArchivedStockReceiptEntry = ArchivedStockReceiptRecord & {
  receipt: StockReceiptListItem
}

export type StockReceiptsRegistryValue = {
  userReceipts: StockReceiptListItem[]
  allReceipts: StockReceiptListItem[]
  archivedReceipts: ArchivedStockReceiptEntry[]
  findById: (id: string) => StockReceiptListItem | undefined
  addReceipt: (values: StockReceiptFormValues) => Promise<StockReceiptListItem>
  updateReceiptFromDetail: (detail: StockReceiptDetail) => Promise<void>
  confirmReceipt: (
    detail: StockReceiptDetail,
    options?: { onPurchaseUpdated?: (purchaseId: string) => void },
  ) => Promise<{ ok: boolean; message?: string }>
  archiveReceipt: (id: string) => Promise<void>
  archiveReceipts: (ids: string[]) => Promise<void>
  restoreReceipt: (id: string) => Promise<void>
  restoreReceipts: (ids: string[]) => Promise<void>
  permanentlyDeleteReceipt: (id: string) => Promise<void>
  permanentlyDeleteReceipts: (ids: string[]) => Promise<void>
  isArchived: (id: string) => boolean
  reloadFromApi: () => Promise<void>
}

export const StockReceiptsRegistryContext =
  createContext<StockReceiptsRegistryValue | null>(null)
