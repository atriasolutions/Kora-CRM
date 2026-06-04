import { purgeEntityAttachments } from '@/lib/entity-attachments-purge'
import { removePurchaseDetailOverride } from '@/lib/purchase-detail-storage'
import { removePurchaseJourneyOverride } from '@/lib/purchase-journey'

/** Limpia datos locales asociados a la compra (no reversible). */
export function purgePurchaseLocalData(purchaseId: string) {
  const id = purchaseId.trim()
  if (!id) return
  purgeEntityAttachments('compra', id, 'compra')
  removePurchaseDetailOverride(id)
  removePurchaseJourneyOverride(id)
}
