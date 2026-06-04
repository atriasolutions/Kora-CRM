import type { ActivityDetail, ActivityListItem } from '../types/activity.js'
import {
  formatActivityLabel,
  formatReminderLabelFromAt,
  toDatetimeLocalValue,
  toIsoString,
} from '../utils/format.js'

export type ActivityRow = {
  id: string
  title: string
  activity_type: string
  type_label: string | null
  related_type: string
  related_id: string
  related_name: string
  company_name: string
  due_at: Date | string | null
  assignee_name: string | null
  status: string
  priority: string | null
  scheduled_at: Date | string | null
  reminder_at: Date | string | null
  created_at: Date
  created_by_id: string | null
  created_by_name: string | null
  updated_at: Date
  updated_by_id: string | null
  updated_by_name: string | null
}

function dueLabel(row: ActivityRow): string {
  const at = row.due_at ?? row.scheduled_at
  return formatActivityLabel(at)
}

export function mapActivityRow(row: ActivityRow): ActivityListItem {
  const scheduledAt = row.scheduled_at ?? row.due_at
  const scheduledForReminder = row.scheduled_at ?? row.due_at
  return {
    id: row.id,
    title: row.title,
    type: row.activity_type,
    typeLabel: row.type_label?.trim() || row.activity_type,
    relatedType: row.related_type,
    relatedId: row.related_id,
    relatedName: row.related_name,
    companyName: row.company_name,
    due: dueLabel(row),
    assignee: row.assignee_name ?? '',
    status: row.status,
    priority: row.priority ?? 'Media',
    createdAt: toIsoString(row.created_at),
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name ?? '',
    updatedAt: toIsoString(row.updated_at),
    updatedById: row.updated_by_id ?? '',
    updatedByName: row.updated_by_name ?? '',
    scheduledAt: scheduledAt ? toDatetimeLocalValue(scheduledAt) : undefined,
    reminderAt: row.reminder_at ? toIsoString(row.reminder_at) : undefined,
    reminder: formatReminderLabelFromAt(scheduledForReminder, row.reminder_at),
  }
}

export function mapActivityDetail(row: ActivityRow): ActivityDetail {
  return mapActivityRow(row)
}
