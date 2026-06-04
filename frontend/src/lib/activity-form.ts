import type { ActivityDetail } from '@/data/activity-detail.mock'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import type { ActivityListItem } from '@/data/activities.mock'
import {
  applyCreateFormValuesToActivity,
  activityDetailToCreateFormValues,
  type CreateActivityFormValues,
} from '@/lib/activity-create'
import { resolveActivityReminderLabel } from '@/lib/activity-reminder'

/** @deprecated Usar CreateActivityFormValues */
export type ActivityFormValues = CreateActivityFormValues

export { ACTIVITY_STATUS_OPTIONS, ACTIVITY_PRIORITY_OPTIONS } from '@/data/activities.mock'

export function activityDetailToFormValues(activity: ActivityDetail): CreateActivityFormValues {
  return activityDetailToCreateFormValues(activity)
}

export function applyFormValuesToActivity(
  activity: ActivityDetail,
  values: CreateActivityFormValues,
): ActivityDetail {
  return applyCreateFormValuesToActivity(activity, values)
}

export function listItemFromActivityDetail(activity: ActivityDetail): ActivityListItem {
  const {
    description: _d,
    durationMinutes: _dm,
    location: _l,
    outcome: _o,
    tags: _t,
    statusHistory: _sh,
    notes: _n,
    completedAt: _c,
    ...list
  } = activity
  return stampRecordAuditOnUpdate({
    ...list,
    reminder: resolveActivityReminderLabel(activity),
  })
}
