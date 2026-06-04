import type {
  ReportFolder,
  ReportItem,
  ReportTableConfigStorage,
} from '../types/report.js'
import type { ReportTemplateId } from '../types/report.js'
import { formatActivityLabel, formatDateLabel, toIsoString } from '../utils/format.js'

export type ReportFolderRow = {
  id: string
  name: string
  parent_id: string | null
  sort_order: number
}

export type ReportRow = {
  id: string
  folder_id: string | null
  name: string
  report_type: string
  author_name: string | null
  schedule: string | null
  description: string | null
  template_id: string | null
  table_config: ReportTableConfigStorage | null
  last_run_at: Date | string | null
  updated_at: Date
}

function resolveTemplateId(row: ReportRow): ReportTemplateId {
  const id = row.template_id?.trim()
  if (id === 'tabla-dinamica' || id === 'nps-clientes' || id === 'generic') {
    return id
  }
  if (row.table_config) return 'tabla-dinamica'
  return 'generic'
}

function reportTypeLabelFromRow(row: ReportRow, templateId: ReportTemplateId): string {
  const fromConfig = row.table_config?.reportTypeLabel?.trim()
  if (fromConfig) return fromConfig
  if (templateId === 'tabla-dinamica') return 'Tabla dinámica'
  if (templateId === 'nps-clientes') return 'CX'
  return row.report_type === 'table' ? 'Tabla dinámica' : 'Dashboard'
}

function stripTableConfig(
  storage: ReportTableConfigStorage | null,
): ReportItem['tableConfig'] | undefined {
  if (!storage) return undefined
  const { reportTypeLabel: _l, ...config } = storage
  return config
}

export function mapReportFolderRow(row: ReportFolderRow): ReportFolder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
  }
}

export function mapReportRow(row: ReportRow): ReportItem {
  const templateId = resolveTemplateId(row)
  const schedule = (row.schedule?.trim() || 'Manual') as ReportItem['schedule']
  return {
    id: row.id,
    name: row.name,
    folderId: row.folder_id ?? '',
    reportType: reportTypeLabelFromRow(row, templateId),
    author: row.author_name ?? '',
    lastRun: row.last_run_at
      ? formatActivityLabel(row.last_run_at)
      : 'Sin ejecutar',
    schedule,
    description: row.description?.trim() ?? '',
    updatedAt: formatDateLabel(row.updated_at),
    templateId,
    tableConfig: stripTableConfig(row.table_config),
  }
}

export function buildTableConfigStorage(
  input: {
    reportType: string
    templateId?: ReportTemplateId
    tableConfig?: ReportTableConfigStorage
  },
): ReportTableConfigStorage | null {
  const templateId = input.templateId ?? 'tabla-dinamica'
  if (templateId === 'tabla-dinamica' && input.tableConfig) {
    return {
      ...input.tableConfig,
      reportTypeLabel: input.reportType.trim() || undefined,
    }
  }
  if (input.reportType.trim()) {
    return { reportTypeLabel: input.reportType.trim() } as ReportTableConfigStorage
  }
  return null
}

export function dbReportType(templateId?: ReportTemplateId): 'table' | 'dashboard' {
  return templateId === 'tabla-dinamica' ? 'table' : 'dashboard'
}

export function toIsoUpdated(row: ReportRow): string {
  return toIsoString(row.updated_at)
}
