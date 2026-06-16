import { getCurrentUserName } from '@/lib/current-user'
import { createDefaultReportTableConfig } from '@/types/report-table'
import type { ReportItem, ReportTemplateId } from '@/types/reports-tree'
import type { ReportItemInput } from '@/contexts/reports-tree-context'

export type ReportFormValues = {
  name: string
  folderId: string
  templateKind: ReportTemplateId
  reportType: string
  author: string
  description: string
  tableConfig?: ReportItemInput['tableConfig']
}

export function createDefaultReportFormValues(
  folderId: string,
  partial?: Partial<ReportFormValues>,
): ReportFormValues {
  return {
    name: '',
    folderId,
    templateKind: 'tabla-dinamica',
    reportType: 'Tabla dinámica',
    author: getCurrentUserName(),
    description: '',
    tableConfig: partial?.tableConfig ?? createDefaultReportTableConfig(),
    ...partial,
  }
}

export function reportToFormValues(report: ReportItem): ReportFormValues {
  return {
    name: report.name,
    folderId: report.folderId,
    templateKind: 'tabla-dinamica',
    reportType: report.reportType,
    author: report.author,
    description: report.description,
    tableConfig: report.tableConfig,
  }
}

export function reportFormToInput(values: ReportFormValues): ReportItemInput {
  return {
    name: values.name.trim(),
    folderId: values.folderId,
    reportType: values.reportType.trim() || 'Tabla dinámica',
    author: values.author.trim(),
    schedule: 'Manual',
    description: values.description.trim(),
    templateId: 'tabla-dinamica',
    tableConfig: values.tableConfig ?? createDefaultReportTableConfig(),
  }
}

export function validateReportForm(values: ReportFormValues): string | null {
  if (!values.name.trim()) return 'El nombre del reporte es obligatorio.'
  if (!values.folderId) return 'Selecciona una carpeta.'
  return null
}

export const REPORT_TEMPLATE_KIND_OPTIONS: { value: ReportTemplateId; label: string }[] = [
  { value: 'tabla-dinamica', label: 'Tabla dinámica' },
]
