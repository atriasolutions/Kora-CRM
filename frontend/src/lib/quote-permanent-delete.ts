import { purgeEntityAttachments } from '@/lib/entity-attachments-purge'
import { removeEntityFromRecentlyViewed } from '@/lib/entity-recently-viewed'

/** Limpia datos de sesión asociados a la cotización (no reversible). */
export function purgeQuoteLocalData(quoteId: string) {
  const id = quoteId.trim()
  if (!id) return
  purgeEntityAttachments('cotizacion', id, 'cotizacion')
  removeEntityFromRecentlyViewed('cotizaciones', id)
}
