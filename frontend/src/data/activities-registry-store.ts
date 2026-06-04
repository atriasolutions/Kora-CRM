import type { ActivityListItem } from '@/data/activities.mock'

let registryUserActivities: ActivityListItem[] = []

export function syncRegistryActivities(items: ActivityListItem[]) {
  registryUserActivities = items
}

export function getRegistryActivities(): ActivityListItem[] {
  return registryUserActivities
}

export function getRegistryActivityById(id: string): ActivityListItem | undefined {
  return registryUserActivities.find((a) => a.id === id)
}
