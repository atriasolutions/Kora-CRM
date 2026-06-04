import { getStockReceiptApi } from '@/api/stock-receipts'
import { isApiEnabled } from '@/api/config'
import { syncRegistryStockReceiptLines } from '@/data/stock-receipt-lines-registry-store'
import type { StockReceiptListItem } from '@/data/stock-receipts.mock'
import type { StockReceiptDetail } from '@/data/stock-receipt-detail.mock'
import { loadStockReceiptDetailOverride } from '@/lib/stock-receipt-detail-storage'

function linesFromDetail(detail: StockReceiptDetail) {
  return detail.lineItems.filter((li) => li.sku.trim())
}

/** Carga líneas de ingresos confirmados (y opcionalmente borradores) en el registro en memoria. */
export async function syncStockReceiptLinesForReceipts(
  receipts: StockReceiptListItem[],
  options?: { confirmedOnly?: boolean },
): Promise<void> {
  const confirmedOnly = options?.confirmedOnly ?? true
  const targets = receipts.filter(
    (r) => !confirmedOnly || r.status === 'Confirmado',
  )
  if (targets.length === 0) return

  const entries: Record<string, StockReceiptDetail['lineItems']> = {}

  if (isApiEnabled()) {
    await Promise.all(
      targets.map(async (r) => {
        try {
          const detail = await getStockReceiptApi(r.id)
          entries[r.id] = linesFromDetail(detail)
        } catch {
          entries[r.id] = []
        }
      }),
    )
  } else {
    for (const r of targets) {
      const override = loadStockReceiptDetailOverride(r.id)
      entries[r.id] = override?.lineItems?.filter((li) => li.sku.trim()) ?? []
    }
  }

  syncRegistryStockReceiptLines(entries)
}
