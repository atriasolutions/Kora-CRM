import { purgeEntityAttachments } from '@/lib/entity-attachments-purge'
import { removeContactFromRecentlyViewed } from '@/lib/contact-recently-viewed'
import { removeContactOutreachSnapshot } from '@/lib/contact-outreach-storage'
import { removeCachedEntityListImage } from '@/lib/entity-list-image-cache'

/** Limpia datos de sesión asociados al contacto (no reversible). */
export function purgeContactLocalData(contactId: string) {
  const id = contactId.trim()
  if (!id) return
  purgeEntityAttachments('contacto', id, 'contacto')
  removeContactFromRecentlyViewed(id)
  removeContactOutreachSnapshot(id)
  removeCachedEntityListImage('contact', id)
}
