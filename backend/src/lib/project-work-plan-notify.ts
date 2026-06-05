import type { AuditActor } from '../types/audit.js'
import {
  normalizeWorkPlanJson,
  type ProjectWorkPlanJson,
} from './project-work-plan-json.js'
import { notifyProjectWorkItemAssignment } from '../services/notifications.service.js'

export type NewWorkItemAssignee = {
  itemId: string
  itemName: string
  assigneeName: string
}

export function collectNewWorkItemAssignees(
  previous: ProjectWorkPlanJson,
  next: ProjectWorkPlanJson,
): NewWorkItemAssignee[] {
  const prevByItem = new Map<string, Set<string>>()
  for (const item of previous.items) {
    const names = new Set<string>()
    for (const raw of item.assignees ?? []) {
      const t = raw.trim().toLowerCase()
      if (t) names.add(t)
    }
    prevByItem.set(item.id, names)
  }

  const out: NewWorkItemAssignee[] = []
  for (const item of next.items) {
    const prev = prevByItem.get(item.id) ?? new Set<string>()
    for (const raw of item.assignees ?? []) {
      const name = raw.trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (prev.has(key)) continue
      out.push({
        itemId: item.id,
        itemName: item.name,
        assigneeName: name,
      })
    }
  }
  return out
}

export function notifyNewWorkItemAssignees(params: {
  actor: AuditActor
  projectId: string
  projectName: string
  previousPlan: unknown
  nextPlan: ProjectWorkPlanJson
}): void {
  const previous = normalizeWorkPlanJson(params.previousPlan)
  const additions = collectNewWorkItemAssignees(previous, params.nextPlan)
  for (const row of additions) {
    void notifyProjectWorkItemAssignment({
      actor: params.actor,
      assigneeName: row.assigneeName,
      projectId: params.projectId,
      projectName: params.projectName,
      workItemName: row.itemName,
    }).catch(() => {
      /* ignore notification errors */
    })
  }
}
