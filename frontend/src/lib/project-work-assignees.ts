import { normalizeWorkItemStatus } from '@/lib/project-work-status'
import type { ProjectWorkItem, ProjectWorkPlan } from '@/types/project-work-plan'

type LegacyWorkItem = ProjectWorkItem & { assignee?: string }

/** Convierte datos legacy (assignee string) a assignees[]. */
export function normalizeWorkItem(raw: LegacyWorkItem): ProjectWorkItem {
  const list = Array.isArray(raw.assignees)
    ? raw.assignees.map((s) => s?.trim()).filter(Boolean)
    : typeof raw.assignee === 'string' && raw.assignee.trim()
      ? [raw.assignee.trim()]
      : []

  const { assignee: _a, assignees: _b, status: savedStatus, ...rest } = raw
  const withAssignees = { ...rest, assignees: list }
  return {
    ...withAssignees,
    status: normalizeWorkItemStatus({
      ...withAssignees,
      status: savedStatus,
    }),
  }
}

export function normalizeProjectWorkPlan(plan: ProjectWorkPlan): ProjectWorkPlan {
  return {
    ...plan,
    items: plan.items.map((item) => normalizeWorkItem(item as LegacyWorkItem)),
  }
}

/** Nombres únicos de responsables asignados en cualquier actividad del plan. */
export function collectWorkPlanAssigneeNames(plan: ProjectWorkPlan): string[] {
  const names = new Set<string>()
  for (const item of plan.items) {
    for (const raw of item.assignees) {
      const name = raw.trim()
      if (name) names.add(name)
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'))
}

/** Opciones del selector: usuarios del CRM + responsables ya asignados en el ítem. */
export function assigneePickerOptions(
  current: string[],
  teamMemberNames?: Iterable<string>,
): string[] {
  const seed = teamMemberNames
    ? Array.from(teamMemberNames).map((n) => n.trim()).filter(Boolean)
    : []
  const set = new Set<string>(seed)
  for (const name of current) {
    const t = name.trim()
    if (t) set.add(t)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))
}

/** Responsables recién añadidos en alguna actividad (comparando dos versiones del plan). */
export function collectNewWorkPlanAssigneeNames(
  previous: ProjectWorkPlan,
  next: ProjectWorkPlan,
): string[] {
  const prevByItem = new Map<string, Set<string>>()
  for (const item of previous.items) {
    const names = new Set<string>()
    for (const raw of item.assignees) {
      const t = raw.trim().toLowerCase()
      if (t) names.add(t)
    }
    prevByItem.set(item.id, names)
  }

  const seen = new Set<string>()
  const out: string[] = []
  for (const item of next.items) {
    const prev = prevByItem.get(item.id) ?? new Set<string>()
    for (const raw of item.assignees) {
      const name = raw.trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (prev.has(key) || seen.has(key)) continue
      seen.add(key)
      out.push(name)
    }
  }
  return out
}

export function toggleAssignee(current: string[], name: string): string[] {
  const trimmed = name.trim()
  if (!trimmed) return current
  return current.includes(trimmed)
    ? current.filter((n) => n !== trimmed)
    : [...current, trimmed]
}
