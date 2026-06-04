import { STORAGE_PREFIX } from '@/config/brand'
import { isLocalDetailStorageActive } from '@/lib/local-detail-storage'
import type { ProductDetail } from '@/data/product-detail.mock'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-product-detail-overrides`

function readAll(): Record<string, Partial<ProductDetail>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, Partial<ProductDetail>>
  } catch {
    return {}
  }
}

export function loadProductDetailOverride(productId: string): Partial<ProductDetail> | null {
  if (!isLocalDetailStorageActive()) return null
  const all = readAll()
  const entry = all[productId]
  return entry ?? null
}

export function removeProductDetailOverride(productId: string) {
  if (!isLocalDetailStorageActive()) return
  const all = readAll()
  if (!all[productId]) return
  delete all[productId]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* quota */
  }
}

export function persistProductDetailOverride(productId: string, detail: ProductDetail) {
  if (!isLocalDetailStorageActive()) return
  try {
    const all = readAll()
    const {
      unitsSold: _us,
      revenue: _r,
      marginPercent: _mp,
      markupPercent: _mu,
      ...persistable
    } = detail
    all[productId] = persistable
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* quota */
  }
}
