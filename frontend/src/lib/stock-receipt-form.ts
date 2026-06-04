import { isApiEnabled } from '@/api/config'
import { stampRecordAuditOnCreate, stampRecordAuditOnUpdate } from '@/lib/record-audit'
import type { PurchaseDetail, PurchaseLineItem } from '@/data/purchase-detail.mock'
import type { StockReceiptDetail, StockReceiptLineItem } from '@/data/stock-receipt-detail.mock'
import { loadCatalogSettings } from '@/lib/catalog-settings'
import { stockReceiptLinesFromPurchase } from '@/lib/stock-receipt-line-item'
import {
  defaultWarehouseFromCatalog,
  resolveWarehouseFromStoredLabel,
  warehouseFormPatchFromSelection,
} from '@/lib/warehouse-lookup'
import type { StockReceiptListItem } from '@/data/stock-receipts.mock'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import { defaultStockReceiptLineItem, productSummaryFromReceiptLines } from '@/lib/stock-receipt-line-item'
import type { StockReceiptDetailOverride } from '@/lib/stock-receipt-detail-storage'

export type StockReceiptSourceMode = 'purchase' | 'standalone'

export type StockReceiptFormValues = {
  sourceMode: StockReceiptSourceMode
  number: string
  externalReference: string
  purchaseId: string
  purchaseReference: string
  supplier: string
  warehouseId: string
  warehouse: string
  ownerName: string
  lineItems: StockReceiptLineItem[]
  /** Snapshot de líneas OC al vincular (validación de pendiente). */
  purchaseLineItems?: PurchaseLineItem[]
  /** Observaciones en el formulario de alta/edición (no es el panel de notas). */
  memo: string
}

const REF_PREFIX = /^ING-(\d{4})-(\d+)$/i

export function generateStockReceiptNumber(existingNumbers: string[] = []): string {
  const year = new Date().getFullYear()
  const prefix = `ING-${year}-`
  let maxSeq = 0

  for (const ref of existingNumbers) {
    const match = ref.trim().match(REF_PREFIX)
    if (!match || Number(match[1]) !== year) continue
    const seq = Number.parseInt(match[2] ?? '0', 10)
    if (!Number.isNaN(seq)) maxSeq = Math.max(maxSeq, seq)
  }

  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`
}

export function createDefaultStockReceiptFormValues(
  partial?: Partial<StockReceiptFormValues>,
  options?: { existingNumbers?: string[] },
): StockReceiptFormValues {
  const catalog = loadCatalogSettings()
  const defaultWh = defaultWarehouseFromCatalog(catalog.warehouses)
  const whPatch = warehouseFormPatchFromSelection(defaultWh)

  return {
    sourceMode: partial?.purchaseId ? 'purchase' : 'standalone',
    number: isApiEnabled()
      ? (partial?.number ?? '')
      : generateStockReceiptNumber(options?.existingNumbers ?? []),
    externalReference: '',
    purchaseId: '',
    purchaseReference: '',
    supplier: '',
    warehouseId: whPatch.warehouseId,
    warehouse: whPatch.warehouse,
    ownerName: getDefaultOwnerName(),
    lineItems: [defaultStockReceiptLineItem()],
    memo: '',
    ...partial,
  }
}

export function stockReceiptFormValuesToListItem(
  values: StockReceiptFormValues,
  id = `stock-receipt-user-${Date.now()}`,
): StockReceiptListItem {
  const lineItems = values.lineItems.filter((li) => li.sku.trim())
  const productSummary = productSummaryFromReceiptLines(lineItems)

  return stampRecordAuditOnCreate({
    id,
    number: values.number.trim(),
    status: 'Borrador',
    externalReference: values.externalReference.trim(),
    purchaseId: values.purchaseId.trim() || undefined,
    purchaseReference: values.purchaseReference.trim() || undefined,
    supplier: values.supplier.trim() || undefined,
    warehouse: values.warehouse.trim() || 'Bodega central',
    productSummary,
    lineCount: lineItems.length,
    owner: values.ownerName.trim(),
  })
}

export function stockReceiptFormValuesToDetailOverride(
  values: StockReceiptFormValues,
  _receiptId: string,
): StockReceiptDetailOverride {
  return {
    lineItems: values.lineItems,
    memo: values.memo,
    externalReference: values.externalReference,
    warehouse: values.warehouse,
    purchaseId: values.purchaseId || undefined,
    purchaseReference: values.purchaseReference || undefined,
    supplier: values.supplier || undefined,
  }
}

export function stockReceiptInitialFromPurchase(
  purchase: PurchaseDetail,
): Partial<StockReceiptFormValues> {
  const lines = stockReceiptLinesFromPurchase(purchase.id, purchase.lineItems)
  const catalog = loadCatalogSettings()
  const resolvedWh =
    (purchase.warehouseId
      ? catalog.warehouses.find((w) => w.id === purchase.warehouseId)
      : undefined) ??
    resolveWarehouseFromStoredLabel(catalog.warehouses, purchase.warehouse) ??
    defaultWarehouseFromCatalog(catalog.warehouses)
  const whPatch = warehouseFormPatchFromSelection(resolvedWh)

  return {
    sourceMode: 'purchase',
    purchaseId: purchase.id,
    purchaseReference: purchase.reference,
    supplier: purchase.supplier,
    warehouseId: purchase.warehouseId ?? whPatch.warehouseId,
    warehouse: whPatch.warehouse || purchase.warehouse || '',
    externalReference: purchase.reference,
    ownerName: purchase.owner,
    purchaseLineItems: purchase.lineItems,
    lineItems: lines.length > 0 ? lines : [defaultStockReceiptLineItem()],
  }
}

export function stockReceiptFormValuesFromDetail(
  detail: StockReceiptDetail,
): StockReceiptFormValues {
  return {
    sourceMode: detail.purchaseId ? 'purchase' : 'standalone',
    number: detail.number,
    externalReference: detail.externalReference,
    purchaseId: detail.purchaseId ?? '',
    purchaseReference: detail.purchaseReference ?? '',
    supplier: detail.supplier ?? '',
    warehouseId: detail.warehouseId ?? '',
    warehouse: detail.warehouse,
    ownerName: detail.owner,
    lineItems:
      detail.lineItems.length > 0
        ? detail.lineItems
        : [defaultStockReceiptLineItem()],
    memo: detail.memo ?? '',
  }
}

export function listItemFromStockReceiptDetail(
  detail: StockReceiptDetail,
): StockReceiptListItem {
  const lineItems = detail.lineItems.filter((li) => li.sku.trim())
  return stampRecordAuditOnUpdate({
    id: detail.id,
    number: detail.number,
    status: detail.status,
    externalReference: detail.externalReference,
    purchaseId: detail.purchaseId,
    purchaseReference: detail.purchaseReference,
    supplier: detail.supplier,
    warehouse: detail.warehouse,
    productSummary: productSummaryFromReceiptLines(lineItems),
    lineCount: lineItems.length,
    createdAt: detail.createdAt,
    confirmedAt: detail.confirmedAt,
    owner: detail.owner,
  })
}
