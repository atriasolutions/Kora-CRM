import { STORAGE_PREFIX } from '@/config/brand'
import { purgeEntityAttachments } from '@/lib/entity-attachments-purge'
import { removeEntityFromRecentlyViewed } from '@/lib/entity-recently-viewed'
import { removeProjectWorkPlan } from '@/lib/project-work-plan'

const JOURNEY_KEY = `${STORAGE_PREFIX}-crm-project-journey`
const RELATIONS_KEY = `${STORAGE_PREFIX}-crm-project-relations`

function removeFromLocalMap(storageKey: string, entityId: string) {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return
    const map = JSON.parse(raw) as Record<string, unknown>
    if (!(entityId in map)) return
    delete map[entityId]
    localStorage.setItem(storageKey, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

/** Limpia datos locales asociados al registro (no reversible). */
export function purgeProjectLocalData(projectId: string) {
  const id = projectId.trim()
  if (!id) return
  purgeEntityAttachments('proyecto', id, 'proyecto')
  removeProjectWorkPlan(id)
  removeEntityFromRecentlyViewed('proyectos', id)
  removeFromLocalMap(JOURNEY_KEY, id)
  removeFromLocalMap(RELATIONS_KEY, id)
}
