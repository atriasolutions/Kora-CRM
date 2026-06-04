import { isApiEnabled } from '@/api/config'
import { getPurchaseApi } from '@/api/purchases'
import type { PurchaseLineItem } from '@/data/purchase-detail.mock'
import {
  getRegistryPurchaseLines,
  mergeRegistryPurchaseLines,
} from '@/data/purchases-registry-store'
import { syncPurchaseLinesReceivedFromIngresos } from '@/lib/purchase-inbound-stock'

/** Líneas reales de la OC (registro en memoria); sin datos mock de demostración. */
export function getPurchaseLinesSync(purchaseId: string): PurchaseLineItem[] {
  return getRegistryPurchaseLines(purchaseId) ?? []
}

export async function fetchAndCachePurchaseLines(
  purchaseId: string,
): Promise<PurchaseLineItem[]> {
  const detail = await getPurchaseApi(purchaseId)
  const lines = syncPurchaseLinesReceivedFromIngresos(
    purchaseId,
    detail.lineItems ?? [],
  )
  mergeRegistryPurchaseLines({ [purchaseId]: lines })
  return lines
}

export function mergePurchaseLinesWithIngresos(
  updates: Record<string, PurchaseLineItem[]>,
): void {
  const synced = Object.fromEntries(
    Object.entries(updates).map(([purchaseId, lines]) => [
      purchaseId,
      syncPurchaseLinesReceivedFromIngresos(purchaseId, lines),
    ]),
  )
  mergeRegistryPurchaseLines(synced)
}

export async function resolvePurchaseLines(
  purchaseId: string,
): Promise<PurchaseLineItem[]> {
  const cached = getRegistryPurchaseLines(purchaseId)
  if (cached !== undefined) return cached
  if (!isApiEnabled()) return []
  return fetchAndCachePurchaseLines(purchaseId)
}
