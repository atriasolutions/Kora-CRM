import type { ActivityListItem, ActivityRelatedType } from '@/data/activities.mock'
import type { ContactActivity } from '@/data/contact-detail.mock'
import { getRegistryActivities } from '@/data/activities-registry-store'
import { listItemToContactActivity } from '@/lib/contact-activities'

export function activitiesForRelatedEntity(
  all: ActivityListItem[],
  relatedType: ActivityRelatedType,
  relatedIds: Set<string>,
  matchExtra?: (item: ActivityListItem) => boolean,
): ContactActivity[] {
  return all
    .filter(
      (a) =>
        a.relatedType === relatedType &&
        (relatedIds.has(a.relatedId) || (matchExtra?.(a) ?? false)),
    )
    .map((item) => listItemToContactActivity(item))
}

export function buildEntityActivitiesForDetail(input: {
  relatedType: ActivityRelatedType
  entityId: string
  relatedName: string
  companyName?: string
  relatedIds: Set<string>
  matchExtra?: (item: ActivityListItem) => boolean
  templates: Omit<ContactActivity, 'id' | 'recordId' | 'status' | 'priority'>[]
  seedRecordFilter?: (item: ActivityListItem) => boolean
}): ContactActivity[] {
  void input.templates
  void input.seedRecordFilter
  return activitiesForRelatedEntity(
    getRegistryActivities(),
    input.relatedType,
    input.relatedIds,
    input.matchExtra,
  )
}
