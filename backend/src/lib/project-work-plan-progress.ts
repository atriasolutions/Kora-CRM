import {
  normalizeWorkPlanJson,
  type ProjectWorkPlanJson,
} from './project-work-plan-json.js'

type WorkItem = ProjectWorkPlanJson['items'][number]

const VALID_STATUSES = new Set([
  'no_iniciado',
  'planificado',
  'en_proceso',
  'detenido',
  'completado',
  'cancelado',
])

function normalizeWorkItemStatus(item: WorkItem): string {
  if (item.status && VALID_STATUSES.has(item.status)) return item.status
  if (item.actualEnd?.trim()) return 'completado'
  if (item.actualStart?.trim()) return 'en_proceso'
  if (item.estimatedStart?.trim() || item.estimatedEnd?.trim()) return 'planificado'
  return 'no_iniciado'
}

function leafItems(plan: ProjectWorkPlanJson): WorkItem[] {
  const parentIds = new Set(
    plan.items.filter((i) => i.parentId).map((i) => i.parentId as string),
  )
  return plan.items.filter((i) => !parentIds.has(i.id))
}

/** Avance = ítems hoja completados / ítems hoja contables (excluye cancelados). */
export function computeWorkPlanProgressPct(raw: unknown): number {
  const plan = normalizeWorkPlanJson(raw)
  const leaves = leafItems(plan)
  const countable = leaves.filter((i) => normalizeWorkItemStatus(i) !== 'cancelado')
  const itemsTotal = countable.length
  if (itemsTotal === 0) return 0
  const itemsDone = countable.filter(
    (i) => normalizeWorkItemStatus(i) === 'completado',
  ).length
  return Math.min(100, Math.round((itemsDone / itemsTotal) * 100))
}
