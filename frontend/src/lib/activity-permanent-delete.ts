import { purgeEntityAttachments } from '@/lib/entity-attachments-purge'

/** Limpia datos locales asociados al registro (no reversible). */
export function purgeActivityLocalData(activityId: string) {
  const id = activityId.trim()
  if (!id) return
  purgeEntityAttachments('actividad', id)
}
