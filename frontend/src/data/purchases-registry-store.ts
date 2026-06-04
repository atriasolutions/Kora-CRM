import type { PurchaseLineItem } from '@/data/purchase-detail.mock'
import type { PurchaseListItem } from '@/data/purchases.mock'

let userSnapshot: PurchaseListItem[] = []
let lineItemsByPurchaseId: Record<string, PurchaseLineItem[]> = {}

export function syncRegistryPurchases(userPurchases: PurchaseListItem[]) {
  userSnapshot = userPurchases
}

export const PURCHASE_LINES_SYNC_EVENT = 'kora:purchase-lines-sync'

export function syncRegistryPurchaseLines(
  linesByPurchaseId: Record<string, PurchaseLineItem[]>,
) {
  lineItemsByPurchaseId = linesByPurchaseId
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PURCHASE_LINES_SYNC_EVENT))
  }
}

/** Fusiona líneas sin borrar las ya cargadas de otras OC. */
export function mergeRegistryPurchaseLines(
  updates: Record<string, PurchaseLineItem[]>,
) {
  lineItemsByPurchaseId = { ...lineItemsByPurchaseId, ...updates }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PURCHASE_LINES_SYNC_EVENT))
  }
}

export function getRegistryPurchaseLines(
  purchaseId: string,
): PurchaseLineItem[] | undefined {
  return lineItemsByPurchaseId[purchaseId]
}

export function getAllRegistryPurchases(): PurchaseListItem[] {
  return userSnapshot
}

export function getRegistryPurchaseById(id: string): PurchaseListItem | undefined {
  return getAllRegistryPurchases().find((p) => p.id === id)
}

export function isUserPurchaseId(id: string): boolean {
  return id.startsWith('purchase-user-')
}
