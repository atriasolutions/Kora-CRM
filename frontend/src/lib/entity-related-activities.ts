import { listActivitiesForRelatedApi } from '@/api/activities'
import { isApiEnabled } from '@/api/config'
import type { ActivityRelatedType } from '@/data/activities.mock'
import type { ContactActivity } from '@/data/contact-detail.mock'
import { listItemToContactActivity } from '@/lib/contact-activities'

export async function loadRelatedActivitiesForDetail(
  relatedType: ActivityRelatedType,
  relatedId: string,
): Promise<ContactActivity[]> {
  if (!isApiEnabled()) return []
  try {
    const items = await listActivitiesForRelatedApi(relatedType, relatedId)
    return items.map(listItemToContactActivity)
  } catch {
    return []
  }
}
