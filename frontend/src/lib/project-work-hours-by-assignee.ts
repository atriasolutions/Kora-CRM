import {
  daysBetween,
  leafItems,
  parseISODate,
  startOfDay,
} from '@/lib/project-work-plan'
import { isWorkItemCancelled } from '@/lib/project-work-status'
import type { ProjectWorkItem, ProjectWorkPlan } from '@/types/project-work-plan'

export type WorkHoursPeriodScope = 'project' | 'month' | 'day'

export type WorkHoursByAssigneeFilters = {
  scope: WorkHoursPeriodScope
  /** YYYY-MM-DD cuando scope === 'day' */
  day?: string
  /** YYYY-MM cuando scope === 'month' */
  month?: string
}

export type AssigneeHoursRow = {
  name: string
  estimatedHours: number
  actualHours: number
  activityCount: number
}

export type WorkHoursByAssigneeResult = {
  rows: AssigneeHoursRow[]
  totals: { estimatedHours: number; actualHours: number; activityCount: number }
}

function itemPlannedRange(item: ProjectWorkItem): { start: Date; end: Date } | null {
  const start =
    parseISODate(item.estimatedStart) ??
    parseISODate(item.actualStart)
  const end =
    parseISODate(item.estimatedEnd) ??
    parseISODate(item.actualEnd) ??
    start
  if (!start || !end) return null
  if (startOfDay(end) < startOfDay(start)) return { start: end, end: start }
  return { start, end }
}

function inclusiveDayCount(start: Date, end: Date): number {
  return daysBetween(start, end) + 1
}

function parseMonthKey(month?: string): { year: number; month: number } | null {
  if (!month?.trim()) return null
  const [y, m] = month.split('-').map((x) => Number.parseInt(x, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null
  return { year: y, month: m }
}

function parseDayKey(day?: string): Date | null {
  return parseISODate(day ?? '')
}

/** Días del rango [start,end] que caen en el mes indicado (1-based month). */
function daysInMonthOverlap(
  rangeStart: Date,
  rangeEnd: Date,
  year: number,
  month: number,
): number {
  let count = 0
  const cursor = startOfDay(rangeStart)
  const end = startOfDay(rangeEnd)
  while (cursor <= end) {
    if (cursor.getFullYear() === year && cursor.getMonth() + 1 === month) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

function fractionInScope(
  item: ProjectWorkItem,
  filters: WorkHoursByAssigneeFilters,
): number {
  if (filters.scope === 'project') return 1

  const range = itemPlannedRange(item)
  if (!range) return 0

  const totalDays = inclusiveDayCount(range.start, range.end)
  if (totalDays <= 0) return 0

  if (filters.scope === 'day') {
    const day = parseDayKey(filters.day)
    if (!day) return 0
    const d = startOfDay(day)
    if (d < startOfDay(range.start) || d > startOfDay(range.end)) return 0
    return 1 / totalDays
  }

  const monthKey = parseMonthKey(filters.month)
  if (!monthKey) return 0
  const overlap = daysInMonthOverlap(
    range.start,
    range.end,
    monthKey.year,
    monthKey.month,
  )
  if (overlap <= 0) return 0
  return overlap / totalDays
}

function assigneeNames(item: ProjectWorkItem): string[] {
  const names = item.assignees.map((n) => n.trim()).filter(Boolean)
  return names.length > 0 ? names : ['Sin asignar']
}

export function computeHoursByAssignee(
  plan: ProjectWorkPlan,
  filters: WorkHoursByAssigneeFilters,
): WorkHoursByAssigneeResult {
  const map = new Map<string, AssigneeHoursRow>()

  const bump = (name: string, est: number, act: number) => {
    const prev = map.get(name) ?? {
      name,
      estimatedHours: 0,
      actualHours: 0,
      activityCount: 0,
    }
    map.set(name, {
      name,
      estimatedHours: Math.round((prev.estimatedHours + est) * 100) / 100,
      actualHours: Math.round((prev.actualHours + act) * 100) / 100,
      activityCount: prev.activityCount + 1,
    })
  }

  for (const item of leafItems(plan)) {
    if (isWorkItemCancelled(item)) continue

    const fraction = fractionInScope(item, filters)
    if (fraction <= 0) continue

    const names = assigneeNames(item)
    const share = fraction / names.length
    const est = (item.estimatedHours || 0) * share
    const act = (item.actualHours || 0) * share

    for (const name of names) {
      bump(name, est, act)
    }
  }

  const rows = Array.from(map.values()).sort((a, b) =>
    b.estimatedHours - a.estimatedHours || a.name.localeCompare(b.name, 'es'),
  )

  const totals = rows.reduce(
    (acc, r) => ({
      estimatedHours: Math.round((acc.estimatedHours + r.estimatedHours) * 100) / 100,
      actualHours: Math.round((acc.actualHours + r.actualHours) * 100) / 100,
      activityCount: acc.activityCount + r.activityCount,
    }),
    { estimatedHours: 0, actualHours: 0, activityCount: 0 },
  )

  return { rows, totals }
}

/** Mes por defecto (hoy) en formato YYYY-MM. */
export function defaultWorkHoursMonthKey(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${m}`
}

/** Día por defecto (hoy) en formato YYYY-MM-DD. */
export function defaultWorkHoursDayKey(): string {
  const d = new Date()
  const day = String(d.getDate()).padStart(2, '0')
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
