import { purgeEntityAttachments } from '@/lib/entity-attachments-purge'
import { removeProductDetailOverride } from '@/lib/product-detail-storage'

/** Limpia datos locales asociados al producto (no reversible). */
export function purgeProductLocalData(productId: string) {
  const id = productId.trim()
  if (!id) return
  purgeEntityAttachments('producto', id)
  removeProductDetailOverride(id)
}
