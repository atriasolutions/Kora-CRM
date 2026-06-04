import type { InventoryDetail } from '@/data/inventory-detail.mock'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import type { InventoryListItem, InventoryStatus } from '@/data/inventory.mock'
import {
  INVENTORY_LOCATION_OPTIONS,
  INVENTORY_STATUS_OPTIONS,
} from '@/data/inventory.mock'
import { deriveInventoryStatusFromRow } from '@/lib/inventory-status'
import { enrichInventoryListItem } from '@/lib/stock-service'

export type InventoryFormValues = {
  productName: string
  sku: string
  location: string
  quantity: string
  minStock: string
  status: InventoryStatus
  ownerName: string
  description: string
  category: string
  unitCost: string
  warehouseZone: string
  linkedPurchaseRef: string
}

export { INVENTORY_STATUS_OPTIONS, INVENTORY_LOCATION_OPTIONS }

export function inventoryDetailToFormValues(item: InventoryDetail): InventoryFormValues {
  return {
    productName: item.productName,
    sku: item.sku,
    location: item.location,
    quantity: item.quantity,
    minStock: item.minStock,
    status: item.status,
    ownerName: item.owner,
    description: item.description,
    category: item.category,
    unitCost: item.unitCost,
    warehouseZone: item.warehouseZone,
    linkedPurchaseRef: item.linkedPurchaseRef ?? '',
  }
}

function parseQuantityNum(value: string, fallback: number): number {
  const n = Number.parseInt(value.replace(/[^\d]/g, ''), 10)
  return Number.isFinite(n) ? n : fallback
}

export function applyFormValuesToInventory(
  item: InventoryDetail,
  values: InventoryFormValues,
): InventoryDetail {
  const quantityNum = parseQuantityNum(values.quantity, item.quantityNum)
  const minStockNum = parseQuantityNum(values.minStock, item.minStockNum)
  const enriched = enrichInventoryListItem({
    ...item,
    quantityNum,
    minStockNum,
    status: values.status,
  })
  const status = deriveInventoryStatusFromRow(enriched)
  const stockHealthPercent =
    minStockNum > 0
      ? Math.min(100, Math.round(((enriched.availableQtyNum ?? quantityNum) / minStockNum) * 100))
      : 100

  return {
    ...item,
    productName: values.productName.trim(),
    sku: values.sku.trim(),
    location: values.location.trim(),
    quantity: values.quantity.trim(),
    quantityNum,
    minStock: values.minStock.trim(),
    minStockNum,
    status,
    owner: values.ownerName.trim(),
    description: values.description.trim(),
    category: values.category.trim(),
    unitCost: values.unitCost.trim(),
    warehouseZone: values.warehouseZone.trim(),
    linkedPurchaseRef: values.linkedPurchaseRef.trim() || undefined,
    reservedQtyNum: enriched.reservedQtyNum,
    availableQtyNum: enriched.availableQtyNum,
    onHandQtyNum: enriched.onHandQtyNum,
    stockHealthPercent,
  }
}

export function listItemFromInventoryDetail(item: InventoryDetail): InventoryListItem {
  const {
    description: _d,
    createdAt: _c,
    owner: _o,
    category: _cat,
    unitCost: _uc,
    warehouseZone: _wz,
    linkedPurchaseRef: _lpr,
    nextStep: _n,
    tags: _t,
    movements: _m,
    activities: _a,
    notes: _no,
    files: _f,
    pendingActivities: _pa,
    stockHealthPercent: _shp,
    isProductView: _pv,
    ...list
  } = item
  return stampRecordAuditOnUpdate(list)
}
