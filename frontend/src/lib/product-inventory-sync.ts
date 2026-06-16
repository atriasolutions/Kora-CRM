import { STORAGE_PREFIX } from '@/config/brand'
import type { ProductDetail } from '@/data/product-detail.mock'
import {
  INVENTORY_LOCATION_OPTIONS,
  type InventoryListItem,
  type InventoryStatus,
} from '@/data/inventory.mock'
import { syncRegistryInventory } from '@/data/inventory-registry-store'
import { parseStockNum } from '@/lib/product-display'
import { stampRecordAuditOnCreate } from '@/lib/record-audit'
import { STOCK_CHANGE_EVENT } from '@/lib/stock-store'
import { normalizeSku } from '@/lib/stock-sku'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-user-inventory`

export const INVENTORY_REGISTRY_SYNC_EVENT = 'kora-inventory-registry-sync'

function loadUserInventory(): InventoryListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as InventoryListItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistUserInventory(items: InventoryListItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
  syncRegistryInventory(items)
  window.dispatchEvent(new CustomEvent(INVENTORY_REGISTRY_SYNC_EVENT))
  window.dispatchEvent(new CustomEvent(STOCK_CHANGE_EVENT))
}

function createInventoryRowId(sku: string): string {
  const slug = normalizeSku(sku).replace(/[^a-z0-9]+/g, '-')
  return `inv-user-${slug}-${Date.now()}`
}

function formatMinStockLabel(value: string, minStockNum: number): string {
  const trimmed = value.trim()
  if (trimmed && trimmed !== '—') return trimmed
  return minStockNum > 0 ? `${minStockNum} u.` : '0 u.'
}

/** Crea o actualiza filas de inventario según la ficha de producto (solo si controla stock). */
export function syncInventoryFromProduct(
  product: ProductDetail,
  options?: { previousSku?: string },
): void {
  if (!product.trackInventory || !product.sku.trim()) return

  const sku = product.sku.trim()
  const previousSku = options?.previousSku?.trim()
  const minStockNum = Math.max(0, parseStockNum(product.minStock))
  const minStock = formatMinStockLabel(product.minStock, minStockNum)
  const defaultLocation = INVENTORY_LOCATION_OPTIONS[0] ?? 'Bodega central'

  let items = loadUserInventory()

  if (previousSku && previousSku !== sku) {
    items = items.map((row) =>
      normalizeSku(row.sku) === normalizeSku(previousSku)
        ? { ...row, sku, productName: product.name.trim() }
        : row,
    )
  }

  const matchIndex = items.findIndex((row) => normalizeSku(row.sku) === normalizeSku(sku))

  if (matchIndex >= 0) {
    const row = items[matchIndex]!
    items[matchIndex] = {
      ...row,
      productName: product.name.trim(),
      sku,
      minStock,
      minStockNum,
    }
  } else {
    const row = stampRecordAuditOnCreate({
      id: createInventoryRowId(sku),
      productName: product.name.trim(),
      sku,
      location: defaultLocation,
      quantity: '0 u.',
      quantityNum: 0,
      minStock,
      minStockNum,
      status: 'Sin stock' satisfies InventoryStatus,
      lastMovement: 'Alta de producto · stock inicial 0',
    }) as InventoryListItem
    items = [row, ...items]
  }

  persistUserInventory(items)
}

/** Elimina filas de inventario locales al desactivar control de stock. */
export function removeInventoryForProduct(sku: string): void {
  const key = normalizeSku(sku)
  if (!key) return
  const items = loadUserInventory().filter((row) => normalizeSku(row.sku) !== key)
  persistUserInventory(items)
}
