import { purgeEntityAttachments } from '@/lib/entity-attachments-purge'
import { removeEntityFromRecentlyViewed } from '@/lib/entity-recently-viewed'

/** Limpia datos de sesión asociados a la oportunidad (no reversible). */
export function purgeOpportunityLocalData(opportunityId: string) {
  const id = opportunityId.trim()
  if (!id) return
  purgeEntityAttachments('oportunidad', id, 'oportunidad')
  removeEntityFromRecentlyViewed('oportunidades', id)
}
