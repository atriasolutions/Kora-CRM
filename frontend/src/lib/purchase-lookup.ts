import type { PurchaseListItem } from '@/data/purchases.mock'

export function findPurchaseById(
  purchases: PurchaseListItem[],
  id: string,
): PurchaseListItem | undefined {
  const trimmed = id.trim()
  if (!trimmed) return undefined
  return purchases.find((p) => p.id === trimmed)
}

export function searchPurchases(
  purchases: PurchaseListItem[],
  query: string,
  limit = 12,
): PurchaseListItem[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    return purchases.slice(0, limit)
  }
  return purchases
    .filter(
      (p) =>
        p.reference.toLowerCase().includes(q) ||
        p.supplier.toLowerCase().includes(q) ||
        p.productSummary.toLowerCase().includes(q),
    )
    .slice(0, limit)
}
