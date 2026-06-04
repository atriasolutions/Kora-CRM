import type { ReportTableConfig } from './report-table-config.js'

export type ReportSchedule =
  | 'Diario'
  | 'Semanal'
  | 'Mensual'
  | 'Trimestral'
  | 'Manual'

export type ReportTemplateId = 'tabla-dinamica' | 'nps-clientes' | 'generic'

export type ReportFolder = {
  id: string
  name: string
  parentId: string | null
}

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
  tableConfig?: ReportTableConfig
}

export type ReportsTreeData = {
  folders: ReportFolder[]
  reports: ReportItem[]
}

export type ReportFolderInput = {
  name: string
  parentId: string | null
}

export type ReportItemInput = {
  name: string
  folderId: string
  reportType: string
  author: string
  lastRun?: string
  schedule: ReportSchedule
  description: string
  templateId?: ReportTemplateId
  tableConfig?: ReportTableConfig
}

export type ReportTableConfigStorage = ReportTableConfig & {
  reportTypeLabel?: string
}
