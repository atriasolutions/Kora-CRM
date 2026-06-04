import { removeCompanyDetailOverride } from '@/lib/company-detail-storage'
import { removeCachedEntityListImage } from '@/lib/entity-list-image-cache'
import { purgeEntityAttachments } from '@/lib/entity-attachments-purge'
import { removeEntityFromRecentlyViewed } from '@/lib/entity-recently-viewed'

/** Limpia datos de sesión asociados a la empresa (no reversible). */
export function purgeCompanyLocalData(companyId: string) {
  const id = companyId.trim()
  if (!id) return
  purgeEntityAttachments('empresa', id, 'empresa')
  removeCompanyDetailOverride(id)
  removeCachedEntityListImage('company', id)
  removeEntityFromRecentlyViewed('empresas', id)
}
