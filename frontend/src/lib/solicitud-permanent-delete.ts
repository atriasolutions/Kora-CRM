import { purgeEntityAttachments } from '@/lib/entity-attachments-purge'
import { removeEntityFromRecentlyViewed } from '@/lib/entity-recently-viewed'

/** Limpia datos locales asociados al registro (no reversible). */
export function purgeSolicitudLocalData(solicitudId: string) {
  const id = solicitudId.trim()
  if (!id) return
  purgeEntityAttachments('solicitud', id, 'solicitud')
  removeEntityFromRecentlyViewed('solicitudes', id)
}
