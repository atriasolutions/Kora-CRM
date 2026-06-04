import type { InventoryListItem } from '@/data/inventory.mock'
import { inventoryProductIdFromSku } from '@/lib/inventory-aggregate'
import { normalizeSku } from '@/lib/stock-sku'

export function inventoryActivityLinkId(row: InventoryListItem): string {
  return inventoryProductIdFromSku(row.sku)
}

export function findInventoryRowById(
  rows: InventoryListItem[],
  id: string,
): InventoryListItem | undefined {
  const trimmed = id.trim()
  if (!trimmed) return undefined
  const direct = rows.find((r) => r.id === trimmed)
  if (direct) return direct
  return rows.find((r) => inventoryActivityLinkId(r) === trimmed)
}

export function searchInventoryRows(
  rows: InventoryListItem[],
  query: string,
  limit = 12,
): InventoryListItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows.slice(0, limit)
  const seen = new Set<string>()
  const out: InventoryListItem[] = []
  for (const row of rows) {
    const key = normalizeSku(row.sku)
    if (seen.has(key)) continue
    if (
      row.productName.toLowerCase().includes(q) ||
      row.sku.toLowerCase().includes(q) ||
      row.location.toLowerCase().includes(q)
    ) {
      seen.add(key)
      out.push(row)
      if (out.length >= limit) break
    }
  }
  return out
}
