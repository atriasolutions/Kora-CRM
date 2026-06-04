import type { ProjectWorkItemStatus } from '@/lib/project-work-status'

export type ProjectWorkGroup = {
  id: string
  name: string
  /** Acento visual en la barra del grupo (tailwind color token) */
  accent: 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5'
  collapsed: boolean
  order: number
}

export type ProjectWorkItem = {
  id: string
  groupId: string
  /** null = actividad; con valor = subactividad */
  parentId: string | null
  name: string
  description: string
  /** 0..N responsables (avatares agrupados en tabla) */
  assignees: string[]
  status: ProjectWorkItemStatus
  estimatedHours: number
  actualHours: number
  estimatedStart: string
  estimatedEnd: string
  actualStart: string
  actualEnd: string
  comment: string
  order: number
}

export type ProjectWorkPlan = {
  groups: ProjectWorkGroup[]
  items: ProjectWorkItem[]
}

export type ProjectWorkMetrics = {
  estimatedHours: number
  actualHours: number
  /** Referencia horas reales vs estimadas (no define el avance del proyecto). */
  hoursUtilizationPct: number
  /** Avance según estado Completado / ítems activos. */
  statusProgressPct: number
  itemsTotal: number
  itemsDone: number
  itemsCancelled: number
  itemsOverdue: number
  scheduleDelayDays: number
  onTrack: boolean
}
