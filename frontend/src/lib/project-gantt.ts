import {
  daysBetween,
  isItemDone,
  isItemOverdue,
  parseISODate,
  startOfDay,
} from '@/lib/project-work-plan'
import type { ProjectWorkGroup, ProjectWorkItem, ProjectWorkPlan } from '@/types/project-work-plan'

export type GanttDateRange = {
  start: Date
  end: Date
}

export type GanttTimeline = {
  rangeStart: Date
  rangeEnd: Date
  totalDays: number
  ticks: { date: Date; label: string; leftPct: number }[]
}

export type GanttRow =
  | { kind: 'group'; id: string; label: string; accent: ProjectWorkGroup['accent'] }
  | {
      kind: 'item'
      item: ProjectWorkItem
      depth: 0 | 1
      planned: GanttDateRange | null
      actual: GanttDateRange | null
      done: boolean
      overdue: boolean
    }

function normalizeRange(startIso: string, endIso: string): GanttDateRange | null {
  const start = parseISODate(startIso)
  const end = parseISODate(endIso)
  if (!start && !end) return null
  const s = startOfDay(start ?? end!)
  const e = startOfDay(end ?? start!)
  if (e < s) return { start: e, end: s }
  return { start: s, end: e }
}

export function itemPlannedRange(item: ProjectWorkItem): GanttDateRange | null {
  return normalizeRange(item.estimatedStart, item.estimatedEnd)
}

export function itemActualRange(item: ProjectWorkItem): GanttDateRange | null {
  return normalizeRange(item.actualStart, item.actualEnd)
}

function collectRanges(plan: ProjectWorkPlan): GanttDateRange[] {
  const ranges: GanttDateRange[] = []
  for (const item of plan.items) {
    const planned = itemPlannedRange(item)
    const actual = itemActualRange(item)
    if (planned) ranges.push(planned)
    if (actual) ranges.push(actual)
  }
  return ranges
}

export function buildGanttTimeline(
  plan: ProjectWorkPlan,
  paddingDays = 2,
): GanttTimeline | null {
  const ranges = collectRanges(plan)
  if (ranges.length === 0) return null

  let min = ranges[0]!.start
  let max = ranges[0]!.end
  for (const r of ranges) {
    if (r.start < min) min = r.start
    if (r.end > max) max = r.end
  }

  const rangeStart = new Date(min)
  rangeStart.setDate(rangeStart.getDate() - paddingDays)
  const rangeEnd = new Date(max)
  rangeEnd.setDate(rangeEnd.getDate() + paddingDays)

  const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd) + 1)
  const tickEvery =
    totalDays > 120 ? 14 : totalDays > 60 ? 7 : totalDays > 21 ? 3 : 1

  const ticks: GanttTimeline['ticks'] = []
  for (let offset = 0; offset < totalDays; offset += tickEvery) {
    const date = new Date(rangeStart)
    date.setDate(date.getDate() + offset)
    ticks.push({
      date,
      label: date.toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'short',
      }),
      leftPct: (offset / totalDays) * 100,
    })
  }

  return { rangeStart, rangeEnd, totalDays, ticks }
}

export function rangeToBarStyle(
  range: GanttDateRange,
  timeline: GanttTimeline,
): { leftPct: number; widthPct: number } {
  const startOffset = daysBetween(timeline.rangeStart, range.start)
  const duration = Math.max(1, daysBetween(range.start, range.end) + 1)
  const leftPct = (startOffset / timeline.totalDays) * 100
  const widthPct = (duration / timeline.totalDays) * 100
  return {
    leftPct: Math.min(100, Math.max(0, leftPct)),
    widthPct: Math.min(100 - leftPct, Math.max(1.5, widthPct)),
  }
}

export function buildGanttRows(plan: ProjectWorkPlan): GanttRow[] {
  const groups = [...plan.groups].sort((a, b) => a.order - b.order)
  const rows: GanttRow[] = []
  const today = new Date()

  for (const group of groups) {
    rows.push({ kind: 'group', id: group.id, label: group.name, accent: group.accent })
    const tops = plan.items
      .filter((i) => i.groupId === group.id && !i.parentId)
      .sort((a, b) => a.order - b.order)

    for (const item of tops) {
      rows.push({
        kind: 'item',
        item,
        depth: 0,
        planned: itemPlannedRange(item),
        actual: itemActualRange(item),
        done: isItemDone(item),
        overdue: isItemOverdue(item, today),
      })
      const children = plan.items
        .filter((i) => i.parentId === item.id)
        .sort((a, b) => a.order - b.order)
      for (const child of children) {
        rows.push({
          kind: 'item',
          item: child,
          depth: 1,
          planned: itemPlannedRange(child),
          actual: itemActualRange(child),
          done: isItemDone(child),
          overdue: isItemOverdue(child, today),
        })
      }
    }
  }

  return rows
}

export function ganttTimelineWidthPx(timeline: GanttTimeline): number {
  const dayWidth = timeline.totalDays > 90 ? 10 : timeline.totalDays > 45 ? 14 : 22
  return Math.max(640, timeline.totalDays * dayWidth)
}

/** Línea vertical de «hoy» dentro del rango. */
export function todayMarkerPct(timeline: GanttTimeline): number | null {
  const today = startOfDay(new Date())
  if (today < timeline.rangeStart || today > timeline.rangeEnd) return null
  const offset = daysBetween(timeline.rangeStart, today)
  return (offset / timeline.totalDays) * 100
}

export function countItemsWithPlannedDates(plan: ProjectWorkPlan): number {
  return plan.items.filter((i) => itemPlannedRange(i)).length
}
