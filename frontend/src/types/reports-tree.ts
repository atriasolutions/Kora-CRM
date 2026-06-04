import type { ReportTableConfig } from '@/types/report-table'

export type ReportSchedule = 'Diario' | 'Semanal' | 'Mensual' | 'Trimestral' | 'Manual'

/** Plantilla de ejecución del reporte (define qué vista se renderiza al pulsar Ejecutar). */
export type ReportTemplateId = 'tabla-dinamica' | 'nps-clientes' | 'generic'

export type ReportItem = {
  id: string
  name: string
  folderId: string
  reportType: string
  author: string
  lastRun: string
  schedule: ReportSchedule
  description: string
  updatedAt: string
  templateId?: ReportTemplateId
  /** Configuración de tabla dinámica (columnas, filtros Y/O). */
  tableConfig?: ReportTableConfig
}

export type ReportExecutionStatus = 'idle' | 'running' | 'ready' | 'error'

export type ReportExecutionState = {
  status: ReportExecutionStatus
  completedAt: string | null
  errorMessage?: string
}

export type ReportFolder = {
  id: string
  name: string
  parentId: string | null
}

export type ReportsTreeData = {
  folders: ReportFolder[]
  reports: ReportItem[]
}

export type ReportsSelection =
  | { kind: 'folder'; id: string }
  | { kind: 'report'; id: string }

export const REPORT_SCHEDULE_OPTIONS: ReportSchedule[] = [
  'Diario',
  'Semanal',
  'Mensual',
  'Trimestral',
  'Manual',
]
