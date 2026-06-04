import type { BadgeProps } from '@/components/ui/badge'

export const WORK_ITEM_STATUS_OPTIONS = [
  { value: 'no_iniciado', label: 'No iniciado' },
  { value: 'planificado', label: 'Planificado' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'detenido', label: 'Detenido' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
] as const

export type ProjectWorkItemStatus = (typeof WORK_ITEM_STATUS_OPTIONS)[number]['value']

const STATUS_VALUES = new Set<string>(WORK_ITEM_STATUS_OPTIONS.map((o) => o.value))

export function isWorkItemStatus(value: string): value is ProjectWorkItemStatus {
  return STATUS_VALUES.has(value)
}

export function workItemStatusLabel(status: ProjectWorkItemStatus): string {
  return WORK_ITEM_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

export function workItemStatusVariant(
  status: ProjectWorkItemStatus,
): NonNullable<BadgeProps['variant']> {
  switch (status) {
    case 'completado':
      return 'default'
    case 'en_proceso':
      return 'secondary'
    case 'planificado':
      return 'outline'
    case 'detenido':
      return 'destructive'
    case 'cancelado':
      return 'outline'
    case 'no_iniciado':
    default:
      return 'secondary'
  }
}

/** Fondo del badge de estado (lectura). */
export function workItemStatusBadgeClass(status: ProjectWorkItemStatus): string {
  switch (status) {
    case 'completado':
      return 'border-emerald-600/35 bg-emerald-100 text-emerald-950 dark:bg-emerald-950/80 dark:text-emerald-100'
    case 'en_proceso':
      return 'border-amber-500/40 bg-amber-100 text-amber-950 dark:bg-amber-950/70 dark:text-amber-100'
    case 'planificado':
      return 'border-sky-500/40 bg-sky-100 text-sky-950 dark:bg-sky-950/70 dark:text-sky-100'
    case 'detenido':
      return 'border-orange-500/45 bg-orange-100 text-orange-950 dark:bg-orange-950/70 dark:text-orange-100'
    case 'cancelado':
      return 'border-border bg-muted/80 text-muted-foreground line-through decoration-muted-foreground/70'
    case 'no_iniciado':
    default:
      return 'border-border bg-muted text-muted-foreground'
  }
}

/** Borde izquierdo de la fila en la tabla de actividades. */
export function workItemStatusRowClass(status: ProjectWorkItemStatus): string {
  switch (status) {
    case 'completado':
      return 'border-l-[3px] border-l-emerald-500'
    case 'en_proceso':
      return 'border-l-[3px] border-l-amber-500'
    case 'planificado':
      return 'border-l-[3px] border-l-sky-500'
    case 'detenido':
      return 'border-l-[3px] border-l-orange-500'
    case 'cancelado':
      return 'border-l-[3px] border-l-muted-foreground/40 opacity-75'
    case 'no_iniciado':
    default:
      return 'border-l-[3px] border-l-border'
  }
}

/** Selector de estado en edición. */
export function workItemStatusSelectClass(status: ProjectWorkItemStatus): string {
  switch (status) {
    case 'completado':
      return 'border-emerald-600/50 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-100'
    case 'en_proceso':
      return 'border-amber-500/50 bg-amber-50 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100'
    case 'planificado':
      return 'border-sky-500/50 bg-sky-50 text-sky-950 dark:bg-sky-950/50 dark:text-sky-100'
    case 'detenido':
      return 'border-orange-500/50 bg-orange-50 text-orange-950 dark:bg-orange-950/50 dark:text-orange-100'
    case 'cancelado':
      return 'border-border bg-muted/60 text-muted-foreground'
    case 'no_iniciado':
    default:
      return 'border-border bg-muted/40 text-foreground'
  }
}

type StatusSource = {
  status?: string
  actualEnd?: string
  actualStart?: string
  estimatedStart?: string
  estimatedEnd?: string
}

/** Usa el estado guardado; solo infiere por fechas si falta o es inválido. */
export function normalizeWorkItemStatus(item: StatusSource): ProjectWorkItemStatus {
  if (item.status && isWorkItemStatus(item.status)) return item.status
  if (item.actualEnd?.trim()) return 'completado'
  if (item.actualStart?.trim()) return 'en_proceso'
  if (item.estimatedStart?.trim() || item.estimatedEnd?.trim()) return 'planificado'
  return 'no_iniciado'
}

export function isWorkItemCompleted(item: StatusSource & { status: ProjectWorkItemStatus }): boolean {
  return item.status === 'completado'
}

export function isWorkItemCancelled(item: StatusSource & { status: ProjectWorkItemStatus }): boolean {
  return item.status === 'cancelado'
}

/** Cuenta para el % de avance (excluye canceladas). */
export function isWorkItemCountable(
  item: StatusSource & { status: ProjectWorkItemStatus },
): boolean {
  return !isWorkItemCancelled(item)
}
