import { STORAGE_PREFIX } from '@/config/brand'
import { isLocalDetailStorageActive } from '@/lib/local-detail-storage'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-purchase-details`

export type PurchaseDetailOverride = Partial<
  Omit<PurchaseDetail, 'id' | 'activities' | 'notes' | 'files'>
>

function readAll(): Record<string, PurchaseDetailOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, PurchaseDetailOverride>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, PurchaseDetailOverride>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* quota */
  }
}

export function loadPurchaseDetailOverride(
  purchaseId: string,
): PurchaseDetailOverride | null {
  if (!isLocalDetailStorageActive()) return null
  const entry = readAll()[purchaseId]
  return entry ?? null
}

export function persistPurchaseDetailOverride(
  purchaseId: string,
  override: PurchaseDetailOverride,
) {
  if (!isLocalDetailStorageActive()) return
  const all = readAll()
  all[purchaseId] = { ...all[purchaseId], ...override }
  writeAll(all)
}

export function removePurchaseDetailOverride(purchaseId: string) {
  if (!isLocalDetailStorageActive()) return
  const all = readAll()
  if (!all[purchaseId]) return
  delete all[purchaseId]
  writeAll(all)
}

export function mergeDetailOverride(
  base: PurchaseDetail,
  override: PurchaseDetailOverride | null,
): PurchaseDetail {
  if (!override) return base
  return {
    ...base,
    ...override,
    lineItems: override.lineItems ?? base.lineItems,
    tags: override.tags ?? base.tags,
    stageHistory: override.stageHistory ?? base.stageHistory,
  }
}
