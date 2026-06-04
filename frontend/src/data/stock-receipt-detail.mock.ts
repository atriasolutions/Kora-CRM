import type { ContactActivity, ContactNote } from '@/data/contact-detail.mock'
import { mergeEntityNotesForMock } from '@/lib/entity-notes-storage'
import { stockReceiptListSeed, type StockReceiptListItem } from '@/data/stock-receipts.mock'
import {
  getAllRegistryStockReceipts,
  getArchivedRegistryStockReceipts,
  getRegistryStockReceiptById,
} from '@/data/stock-receipts-registry-store'
import {
  loadStockReceiptDetailOverride,
  mergeStockReceiptDetailOverride,
} from '@/lib/stock-receipt-detail-storage'
import { buildStockReceiptActivitiesForDetail } from '@/lib/stock-receipt-activities'
import {
  defaultStockReceiptNotes,
  stockReceiptNotesFromStorage,
} from '@/lib/stock-receipt-notes'

export type StockReceiptLineItem = {
  id: string
  productId?: string
  product: string
  sku: string
  quantity: number
}

export type StockReceiptDetail = StockReceiptListItem & {
  warehouseId?: string
  notes: ContactNote[]
  /** Observaciones del formulario (distinto del panel de notas). */
  memo?: string
  lineItems: StockReceiptLineItem[]
  activities: ContactActivity[]
}

export function resolveStockReceiptListItem(
  id: string,
  base?: StockReceiptListItem,
): StockReceiptListItem {
  const fromRegistry = getRegistryStockReceiptById(id)
  if (fromRegistry) return { ...fromRegistry, id }
  if (base) return { ...base, id }

  const direct = stockReceiptListSeed.find((r) => r.id === id)
  if (direct) return { ...direct, id }

  const pageMatch = /^ingresos-(\d+)$/.exec(id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = stockReceiptListSeed[idx % stockReceiptListSeed.length]
    return { ...seed!, id }
  }

  throw new Error(`Ingreso no encontrado: ${id}`)
}

function defaultLineItemsFor(id: string): StockReceiptLineItem[] {
  return [
    {
      id: `${id}-li-1`,
      sku: 'LIC-SAAS-50',
      product: 'Licencia SaaS anual',
      quantity: 10,
    },
    {
      id: `${id}-li-2`,
      sku: 'MOD-BI',
      product: 'Módulo BI',
      quantity: 5,
    },
  ]
}

export function getStockReceiptDetail(id: string): StockReceiptDetail {
  const base = resolveStockReceiptListItem(id)
  const override = loadStockReceiptDetailOverride(id)

  const lineItems =
    override?.lineItems ??
    (base.lineCount <= 1
      ? [
          {
            id: `${id}-li-1`,
            sku: 'SRV-CONSULT',
            product: base.productSummary,
            quantity: 1,
          },
        ]
      : defaultLineItemsFor(id))

  const hasStoredNotes =
    override &&
    ((Array.isArray(override.notes) && override.notes.length > 0) ||
      (typeof override.notes === 'string' && override.notes.trim()))

  const detail: StockReceiptDetail = {
    ...base,
    notes: hasStoredNotes
      ? stockReceiptNotesFromStorage(override?.notes, base.owner, id)
      : defaultStockReceiptNotes(id, base.owner),
    memo: override?.memo ?? '',
    lineItems,
    activities: buildStockReceiptActivitiesForDetail(base),
  }

  const merged = mergeStockReceiptDetailOverride(detail, override)
  merged.notes = mergeEntityNotesForMock('recepcion', id, merged.notes ?? [])
  return merged
}

/** Ingresos de una OC: activos + archivados (no eliminados definitivamente). */
export function stockReceiptsForPurchase(purchaseId: string): StockReceiptListItem[] {
  const byId = new Map<string, StockReceiptListItem>()
  for (const r of getAllRegistryStockReceipts()) {
    if (r.purchaseId === purchaseId) byId.set(r.id, r)
  }
  for (const r of getArchivedRegistryStockReceipts()) {
    if (r.purchaseId === purchaseId && !byId.has(r.id)) byId.set(r.id, r)
  }
  return [...byId.values()]
}
