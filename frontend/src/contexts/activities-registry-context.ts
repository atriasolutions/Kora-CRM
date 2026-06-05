import { createContext } from 'react'

import type { ActivityDetail } from '@/data/activity-detail.mock'
import type { ActivityListItem, ActivityStatus } from '@/data/activities.mock'
import type { CreateActivityFormValues } from '@/lib/activity-create'
import type { ArchivedActivityRecord } from '@/lib/activity-archive'

export type ArchivedActivityEntry = ArchivedActivityRecord & {
  activity: ActivityListItem
}

export type ActivitiesRegistryContextValue = {
  userActivities: ActivityListItem[]
  allActivities: ActivityListItem[]
  /** True tras la primera carga desde API (evita falsos «nuevos» recordatorios al refrescar). */
  registryHydrated: boolean
  archivedActivities: ArchivedActivityEntry[]
  findById: (id: string) => ActivityListItem | undefined
  addActivity: (values: CreateActivityFormValues) => Promise<ActivityListItem>
  addActivities: (values: CreateActivityFormValues[]) => Promise<ActivityListItem[]>
  upsertActivityFromDetail: (detail: ActivityDetail) => ActivityDetail
  updateActivityFromDetail: (detail: ActivityDetail) => Promise<void>
  updateActivityStatus: (detail: ActivityDetail, status: ActivityDetail['status']) => Promise<void>
  archiveActivity: (id: string) => Promise<void>
  archiveActivities: (ids: string[]) => Promise<void>
  restoreActivity: (id: string) => Promise<void>
  restoreActivities: (ids: string[]) => Promise<void>
  permanentlyDeleteActivity: (id: string) => Promise<void>
  permanentlyDeleteActivities: (ids: string[]) => Promise<void>
  isArchived: (id: string) => boolean
  reloadFromApi: () => Promise<void>
}

export const ActivitiesRegistryContext =
  createContext<ActivitiesRegistryContextValue | null>(null)
