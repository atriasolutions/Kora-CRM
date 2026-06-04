import {
  isWorkItemCancelled,
  isWorkItemCompleted,
  isWorkItemCountable,
} from '@/lib/project-work-status'
import type {
  ProjectWorkGroup,
  ProjectWorkItem,
  ProjectWorkMetrics,
  ProjectWorkPlan,
} from '@/types/project-work-plan'
import { STORAGE_PREFIX } from '@/config/brand'
import { isApiEnabled } from '@/api/config'
import {
  getProjectWorkPlanApi,
  saveProjectWorkPlanApi,
} from '@/api/projects'
import { apiActionErrorMessage } from '@/api/errors'
import { toast } from '@/lib/toast'
import { createDefaultWorkPlanSeed } from '@/data/project-work-plan.seed'
import { normalizeProjectWorkPlan } from '@/lib/project-work-assignees'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-project-work-plans`

export function createWorkId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/** Horas del plan de trabajo: ≥ 0, máx. 2 decimales. */
export function parseWorkboardHoursInput(raw: string): number {
  const normalized = raw.trim().replace(',', '.')
  if (!normalized) return 0
  const n = Number.parseFloat(normalized)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n * 100) / 100
}

export function formatWorkboardHoursDisplay(hours: number): string {
  if (!hours || hours <= 0) return ''
  const rounded = Math.round(hours * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '')
}

export function createEmptyWorkPlan(): ProjectWorkPlan {
  return { groups: [], items: [] }
}

export function loadProjectWorkPlan(projectId: string): ProjectWorkPlan {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const all = JSON.parse(raw) as Record<string, ProjectWorkPlan>
      if (all[projectId]) {
        return normalizeProjectWorkPlan(all[projectId])
      }
    }
  } catch {
    /* ignore */
  }
  return normalizeProjectWorkPlan(createDefaultWorkPlanSeed(projectId))
}

export async function fetchProjectWorkPlan(
  projectId: string,
): Promise<ProjectWorkPlan> {
  if (isApiEnabled()) {
    const plan = await getProjectWorkPlanApi(projectId)
    return normalizeProjectWorkPlan(plan)
  }
  return loadProjectWorkPlan(projectId)
}

export type WorkPlanPersistOptions = { immediate?: boolean }

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()
const pendingPlans = new Map<string, ProjectWorkPlan>()

export async function flushProjectWorkPlan(projectId: string): Promise<void> {
  const timer = saveTimers.get(projectId)
  if (timer) {
    clearTimeout(timer)
    saveTimers.delete(projectId)
  }
  const plan = pendingPlans.get(projectId)
  if (!plan || !isApiEnabled()) return
  pendingPlans.delete(projectId)
  await saveProjectWorkPlanApi(projectId, plan)
}

export function persistProjectWorkPlan(
  projectId: string,
  plan: ProjectWorkPlan,
  options?: WorkPlanPersistOptions,
) {
  pendingPlans.set(projectId, plan)
  if (!isApiEnabled()) {
    saveProjectWorkPlanLocal(projectId, plan)
    pendingPlans.delete(projectId)
    return
  }
  if (options?.immediate) {
    const prev = saveTimers.get(projectId)
    if (prev) clearTimeout(prev)
    saveTimers.delete(projectId)
    void flushProjectWorkPlan(projectId).catch((error) => {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo guardar el plan de trabajo.'),
      )
    })
    return
  }
  const prev = saveTimers.get(projectId)
  if (prev) clearTimeout(prev)
  saveTimers.set(
    projectId,
    setTimeout(() => {
      void flushProjectWorkPlan(projectId).catch((error) => {
        toast.error(
          apiActionErrorMessage(error, 'No se pudo guardar el plan de trabajo.'),
        )
      })
    }, 350),
  )
}

export function removeProjectWorkPlan(projectId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const all = JSON.parse(raw) as Record<string, ProjectWorkPlan>
    if (!all[projectId]) return
    delete all[projectId]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

function saveProjectWorkPlanLocal(projectId: string, plan: ProjectWorkPlan) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, ProjectWorkPlan>) : {}
    all[projectId] = plan
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

const ACCENTS: ProjectWorkGroup['accent'][] = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
]

export function nextGroupAccent(existing: ProjectWorkGroup[]): ProjectWorkGroup['accent'] {
  return ACCENTS[existing.length % ACCENTS.length]!
}

export function parseISODate(value: string): Date | null {
  if (!value?.trim()) return null
  const d = new Date(`${value}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDisplayDate(iso: string): string {
  const d = parseISODate(iso)
  if (!d) return '—'
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export type WorkItemDatePhase = 'planned' | 'actual'

const DATE_PHASE_LABEL: Record<WorkItemDatePhase, string> = {
  planned: 'planificado',
  actual: 'ejecutado',
}

/** Fin >= inicio cuando ambas fechas del mismo bloque están definidas. */
export function validateWorkItemDateRange(
  startIso: string,
  endIso: string,
  phase: WorkItemDatePhase,
): string | null {
  const start = parseISODate(startIso)
  const end = parseISODate(endIso)
  if (!start || !end) return null
  if (startOfDay(end).getTime() < startOfDay(start).getTime()) {
    return `En ${DATE_PHASE_LABEL[phase]}, la fecha de fin no puede ser anterior a la de inicio.`
  }
  return null
}

export function validateWorkItemDates(item: ProjectWorkItem): string | null {
  return (
    validateWorkItemDateRange(item.estimatedStart, item.estimatedEnd, 'planned') ??
    validateWorkItemDateRange(item.actualStart, item.actualEnd, 'actual')
  )
}

export type WorkItemDateField =
  | 'estimatedStart'
  | 'estimatedEnd'
  | 'actualStart'
  | 'actualEnd'

export function workItemDatePhase(field: WorkItemDateField): WorkItemDatePhase {
  return field === 'estimatedStart' || field === 'estimatedEnd' ? 'planned' : 'actual'
}

/** Valida y devuelve el ítem actualizado, o mensaje de error. */
export function applyWorkItemDateChange(
  item: ProjectWorkItem,
  field: WorkItemDateField,
  value: string,
): { item: ProjectWorkItem } | { error: string } {
  const next = { ...item, [field]: value }
  const phase = workItemDatePhase(field)
  const start =
    phase === 'planned' ? next.estimatedStart : next.actualStart
  const end = phase === 'planned' ? next.estimatedEnd : next.actualEnd
  const error = validateWorkItemDateRange(start, end, phase)
  if (error) return { error }
  return { item: next }
}

export function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function daysBetween(a: Date, b: Date) {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export function isItemDone(item: ProjectWorkItem) {
  return isWorkItemCompleted(item)
}

export function isItemOverdue(item: ProjectWorkItem, today = new Date()) {
  if (isItemDone(item) || isWorkItemCancelled(item)) return false
  const end = parseISODate(item.estimatedEnd)
  if (!end) return false
  return startOfDay(today) > startOfDay(end)
}

export function itemDelayDays(item: ProjectWorkItem, today = new Date()) {
  if (!isItemOverdue(item, today)) return 0
  const end = parseISODate(item.estimatedEnd)!
  return daysBetween(end, today)
}

/** Hojas = ítems sin hijos; si hay subactividades, el padre no suma horas */
export function leafItems(plan: ProjectWorkPlan): ProjectWorkItem[] {
  const parentIds = new Set(
    plan.items.filter((i) => i.parentId).map((i) => i.parentId as string),
  )
  return plan.items.filter((i) => !parentIds.has(i.id))
}

export function childrenOf(plan: ProjectWorkPlan, parentId: string) {
  return plan.items
    .filter((i) => i.parentId === parentId)
    .sort((a, b) => a.order - b.order)
}

export function topLevelInGroup(plan: ProjectWorkPlan, groupId: string) {
  return plan.items
    .filter((i) => i.groupId === groupId && !i.parentId)
    .sort((a, b) => a.order - b.order)
}

export function computeWorkMetrics(plan: ProjectWorkPlan): ProjectWorkMetrics {
  const leaves = leafItems(plan)
  const estimatedHours = leaves.reduce((s, i) => s + (i.estimatedHours || 0), 0)
  const actualHours = leaves.reduce((s, i) => s + (i.actualHours || 0), 0)
  const hoursUtilizationPct =
    estimatedHours > 0 ? Math.min(100, Math.round((actualHours / estimatedHours) * 100)) : 0

  const countable = leaves.filter(isWorkItemCountable)
  const itemsTotal = countable.length
  const itemsDone = countable.filter((i) => isItemDone(i)).length
  const itemsCancelled = leaves.filter((i) => isWorkItemCancelled(i)).length
  const statusProgressPct =
    itemsTotal > 0 ? Math.min(100, Math.round((itemsDone / itemsTotal) * 100)) : 0

  const today = new Date()
  const overdueItems = countable.filter((i) => isItemOverdue(i, today))
  const itemsOverdue = overdueItems.length
  const scheduleDelayDays = overdueItems.reduce(
    (max, i) => Math.max(max, itemDelayDays(i, today)),
    0,
  )

  return {
    estimatedHours,
    actualHours,
    hoursUtilizationPct,
    statusProgressPct,
    itemsTotal,
    itemsDone,
    itemsCancelled,
    itemsOverdue,
    scheduleDelayDays,
    onTrack: itemsOverdue === 0,
  }
}

export function groupTotals(plan: ProjectWorkPlan, groupId: string) {
  const leaves = leafItems(plan).filter((i) => i.groupId === groupId)
  const countable = leaves.filter(isWorkItemCountable)
  const done = countable.filter((i) => isItemDone(i)).length
  const total = countable.length
  return {
    estimatedHours: leaves.reduce((s, i) => s + i.estimatedHours, 0),
    actualHours: leaves.reduce((s, i) => s + i.actualHours, 0),
    done,
    total,
    statusPct: total > 0 ? Math.round((done / total) * 100) : 0,
  }
}

export function addGroup(plan: ProjectWorkPlan, name: string): ProjectWorkPlan {
  const order = plan.groups.length
  const group: ProjectWorkGroup = {
    id: createWorkId('grp'),
    name: name.trim() || 'Nuevo grupo',
    accent: nextGroupAccent(plan.groups),
    collapsed: false,
    order,
  }
  return { ...plan, groups: [...plan.groups, group] }
}

export function addItem(
  plan: ProjectWorkPlan,
  groupId: string,
  parentId: string | null,
  partial?: Partial<ProjectWorkItem>,
): ProjectWorkPlan {
  const siblings = plan.items.filter(
    (i) => i.groupId === groupId && i.parentId === parentId,
  )
  const item: ProjectWorkItem = {
    id: createWorkId('wi'),
    groupId,
    parentId,
    name: partial?.name ?? (parentId ? 'Nueva subactividad' : 'Nueva actividad'),
    description: partial?.description ?? '',
    assignees: partial?.assignees ?? [],
    status: partial?.status ?? 'no_iniciado',
    estimatedHours: partial?.estimatedHours ?? 0,
    actualHours: partial?.actualHours ?? 0,
    estimatedStart: partial?.estimatedStart ?? '',
    estimatedEnd: partial?.estimatedEnd ?? '',
    actualStart: partial?.actualStart ?? '',
    actualEnd: partial?.actualEnd ?? '',
    comment: partial?.comment ?? '',
    order: siblings.length,
  }
  return { ...plan, items: [...plan.items, item] }
}

export function updateItem(
  plan: ProjectWorkPlan,
  itemId: string,
  patch: Partial<ProjectWorkItem>,
): ProjectWorkPlan {
  return {
    ...plan,
    items: plan.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
  }
}

export function deleteItem(plan: ProjectWorkPlan, itemId: string): ProjectWorkPlan {
  const childIds = new Set<string>()
  const collect = (id: string) => {
    childIds.add(id)
    plan.items.filter((i) => i.parentId === id).forEach((c) => collect(c.id))
  }
  collect(itemId)
  return {
    ...plan,
    items: plan.items.filter((i) => !childIds.has(i.id)),
  }
}

export function deleteGroup(plan: ProjectWorkPlan, groupId: string): ProjectWorkPlan {
  return {
    groups: plan.groups.filter((g) => g.id !== groupId),
    items: plan.items.filter((i) => i.groupId !== groupId),
  }
}

export function toggleGroupCollapsed(
  plan: ProjectWorkPlan,
  groupId: string,
): ProjectWorkPlan {
  return {
    ...plan,
    groups: plan.groups.map((g) =>
      g.id === groupId ? { ...g, collapsed: !g.collapsed } : g,
    ),
  }
}

export function renameGroup(
  plan: ProjectWorkPlan,
  groupId: string,
  name: string,
): ProjectWorkPlan {
  return {
    ...plan,
    groups: plan.groups.map((g) => (g.id === groupId ? { ...g, name: name.trim() } : g)),
  }
}

function collectDescendantIds(plan: ProjectWorkPlan, itemId: string): string[] {
  const ids: string[] = []
  const walk = (parentId: string) => {
    for (const child of plan.items.filter((i) => i.parentId === parentId)) {
      ids.push(child.id)
      walk(child.id)
    }
  }
  walk(itemId)
  return ids
}

function reindexSiblingOrders(
  items: ProjectWorkItem[],
  groupId: string,
  parentId: string | null,
): ProjectWorkItem[] {
  const siblings = items
    .filter((i) => i.groupId === groupId && i.parentId === parentId)
    .sort((a, b) => a.order - b.order)
  const orderById = new Map(siblings.map((s, index) => [s.id, index]))
  return items.map((i) =>
    orderById.has(i.id) ? { ...i, order: orderById.get(i.id)! } : i,
  )
}

function moveArrayItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [removed] = next.splice(from, 1)
  if (!removed) return list
  next.splice(to, 0, removed)
  return next
}

/** Reordena grupos arrastrando uno sobre otro */
export function reorderGroups(
  plan: ProjectWorkPlan,
  activeGroupId: string,
  overGroupId: string,
): ProjectWorkPlan {
  if (activeGroupId === overGroupId) return plan
  const sorted = [...plan.groups].sort((a, b) => a.order - b.order)
  const from = sorted.findIndex((g) => g.id === activeGroupId)
  const to = sorted.findIndex((g) => g.id === overGroupId)
  if (from < 0 || to < 0) return plan
  const groups = moveArrayItem(sorted, from, to).map((g, order) => ({ ...g, order }))
  return { ...plan, groups }
}

/**
 * Mueve una actividad (y sus subactividades) a otra posición, grupo o lista de hermanos.
 * Si `overItemId` es null, la coloca al final del nivel superior del grupo.
 */
export function moveWorkItem(
  plan: ProjectWorkPlan,
  activeItemId: string,
  target: { groupId: string; parentId: string | null; overItemId: string | null },
): ProjectWorkPlan {
  const active = plan.items.find((i) => i.id === activeItemId)
  if (!active) return plan

  const descendantIds = collectDescendantIds(plan, activeItemId)
  const hasChildren = descendantIds.length > 0
  const blockIds = new Set([activeItemId, ...descendantIds])

  const sourceGroupId = active.groupId
  const sourceParentId = active.parentId

  let targetParentId = target.parentId
  if (hasChildren) targetParentId = null

  let items = plan.items.map((i) => {
    if (i.id === activeItemId) {
      return {
        ...i,
        groupId: target.groupId,
        parentId: targetParentId,
      }
    }
    if (descendantIds.includes(i.id)) {
      return { ...i, groupId: target.groupId }
    }
    return i
  })

  const siblings = items
    .filter(
      (i) =>
        i.groupId === target.groupId &&
        i.parentId === targetParentId &&
        !blockIds.has(i.id),
    )
    .sort((a, b) => a.order - b.order)

  let insertAt = siblings.length
  if (target.overItemId) {
    const overIdx = siblings.findIndex((s) => s.id === target.overItemId)
    if (overIdx >= 0) insertAt = overIdx
  }

  const reordered = [...siblings]
  reordered.splice(insertAt, 0, items.find((i) => i.id === activeItemId)!)

  const orderById = new Map(reordered.map((s, index) => [s.id, index]))
  items = items.map((i) =>
    orderById.has(i.id) ? { ...i, order: orderById.get(i.id)! } : i,
  )

  items = reindexSiblingOrders(items, sourceGroupId, sourceParentId)
  if (sourceGroupId !== target.groupId || sourceParentId !== targetParentId) {
    items = reindexSiblingOrders(items, target.groupId, targetParentId)
  }

  return { ...plan, items }
}

/** Coloca la actividad al final del nivel superior de un grupo */
export function moveWorkItemToGroup(
  plan: ProjectWorkPlan,
  activeItemId: string,
  groupId: string,
): ProjectWorkPlan {
  return moveWorkItem(plan, activeItemId, {
    groupId,
    parentId: null,
    overItemId: null,
  })
}

/** Inserta la actividad en la posición del ítem sobre el que se soltó */
export function moveWorkItemOverItem(
  plan: ProjectWorkPlan,
  activeItemId: string,
  overItemId: string,
): ProjectWorkPlan {
  if (activeItemId === overItemId) return plan
  const over = plan.items.find((i) => i.id === overItemId)
  if (!over) return plan
  const active = plan.items.find((i) => i.id === activeItemId)
  if (!active) return plan

  const descendantIds = collectDescendantIds(plan, activeItemId)
  if (descendantIds.includes(overItemId)) return plan

  const hasChildren = descendantIds.length > 0
  const targetParentId = hasChildren ? null : over.parentId

  return moveWorkItem(plan, activeItemId, {
    groupId: over.groupId,
    parentId: targetParentId,
    overItemId,
  })
}
