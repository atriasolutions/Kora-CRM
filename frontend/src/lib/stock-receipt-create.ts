import { isApiEnabled } from '@/api/config'
import type { PurchaseLineItem } from '@/data/purchase-detail.mock'
import {
  pendingQtyBySkuForPurchase,
} from '@/lib/purchase-inbound-stock'
import type { StockReceiptFormValues } from '@/lib/stock-receipt-form'
import { normalizeSku } from '@/lib/stock-sku'

export type StockReceiptValidationOptions = {
  autoNumber?: boolean
  /** Líneas de la OC vinculada (para validar tope por pendiente). */
  purchaseLineItems?: PurchaseLineItem[]
  /** Al editar un borrador, excluir este ingreso del cálculo de reservado. */
  excludeReceiptId?: string
}

function receiptQtyBySku(values: StockReceiptFormValues): Map<string, number> {
  const map = new Map<string, number>()
  for (const line of values.lineItems) {
    const sku = line.sku?.trim()
    if (!sku || line.quantity <= 0) continue
    const key = normalizeSku(sku)
    map.set(key, (map.get(key) ?? 0) + line.quantity)
  }
  return map
}

function validatePurchaseReceiptQuantities(
  values: StockReceiptFormValues,
  purchaseLineItems: PurchaseLineItem[],
  excludeReceiptId?: string,
): string | null {
  if (!values.purchaseId.trim()) return null

  const pending = pendingQtyBySkuForPurchase(
    values.purchaseId,
    purchaseLineItems,
    { excludeReceiptId },
  )
  const receiptBySku = receiptQtyBySku(values)

  for (const [sku, qty] of receiptBySku) {
    const allowed = pending.get(sku) ?? 0
    if (qty > allowed) {
      const label = sku.toUpperCase()
      if (allowed <= 0) {
        return `El SKU ${label} ya no tiene unidades pendientes en esta OC. Revisa otros ingresos vinculados.`
      }
      return `La cantidad para ${label} supera lo pendiente (${allowed} uds disponibles en esta OC).`
    }
  }

  const hasPending = [...pending.values()].some((n) => n > 0)
  if (hasPending && receiptBySku.size === 0) {
    return 'Agrega al menos una línea con SKU y cantidad.'
  }

  return null
}

export function validateStockReceiptForm(
  values: StockReceiptFormValues,
  options?: StockReceiptValidationOptions,
): string | null {
  const autoNumber = options?.autoNumber ?? isApiEnabled()
  if (!autoNumber && !values.number.trim()) {
    return 'Indica el número de ingreso.'
  }
  if (values.sourceMode === 'standalone' && !values.externalReference.trim()) {
    return 'Indica la referencia externa (factura, guía, etc.).'
  }
  if (values.sourceMode === 'purchase' && !values.purchaseId.trim()) {
    return 'Selecciona la orden de compra.'
  }
  if (!values.warehouse.trim()) return 'Selecciona la bodega.'

  const validLines = values.lineItems.filter(
    (li) => li.sku.trim() && li.quantity > 0,
  )
  if (validLines.length === 0) {
    return 'Agrega al menos una línea con SKU y cantidad.'
  }

  const invalidQty = values.lineItems.find(
    (li) => li.sku.trim() && (!Number.isFinite(li.quantity) || li.quantity < 1),
  )
  if (invalidQty) {
    return 'Cada línea debe tener una cantidad entera mayor a cero.'
  }

  const purchaseLines =
    options?.purchaseLineItems ?? values.purchaseLineItems
  if (
    values.sourceMode === 'purchase' &&
    values.purchaseId.trim() &&
    purchaseLines &&
    purchaseLines.length > 0
  ) {
    const purchaseQtyError = validatePurchaseReceiptQuantities(
      values,
      purchaseLines,
      options?.excludeReceiptId,
    )
    if (purchaseQtyError) return purchaseQtyError
  }

  return null
}
