import { isApiEnabled } from '@/api/config'
import { executeReportTableApi } from '@/api/reports'
import { buildNpsReportResult, type NpsReportResult } from '@/data/nps-report.mock'
import { runReportTable, resolveReportTableConfig } from '@/lib/report-table-run'
import type { ReportTableConfig, ReportTableRunResult } from '@/types/report-table'
import type { ReportItem, ReportTemplateId } from '@/types/reports-tree'

const RUN_DELAY_MS = 900

export function resolveReportTemplate(_report: ReportItem): ReportTemplateId {
  return 'tabla-dinamica'
}

export function formatReportLastRun(date: Date): string {
  return date.toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export type ReportRunResult =
  | { templateId: 'tabla-dinamica'; data: ReportTableRunResult; filterError?: string }
  | { templateId: 'nps-clientes'; data: NpsReportResult }
  | { templateId: 'generic'; message: string }

export async function executeReportTemplate(
  report: ReportItem,
): Promise<ReportRunResult> {
  const templateId = resolveReportTemplate(report)
  await new Promise((resolve) => window.setTimeout(resolve, RUN_DELAY_MS))

  if (templateId === 'nps-clientes') {
    return { templateId: 'nps-clientes', data: buildNpsReportResult() }
  }

  if (templateId === 'tabla-dinamica') {
    const config = resolveReportTableConfig(report.tableConfig ?? null)
    if (isApiEnabled()) {
      const output = await executeReportTableApi(config)
      return {
        templateId: 'tabla-dinamica',
        data: output,
        filterError: output.filterError,
      }
    }
    const output = runReportTable(config)
    return {
      templateId: 'tabla-dinamica',
      data: output,
      filterError: output.filterError,
    }
  }

  return {
    templateId: 'generic',
    message: `Ejecución demo de «${report.name}» completada.`,
  }
}

export function getReportTableConfig(report: ReportItem): ReportTableConfig {
  return resolveReportTableConfig(report.tableConfig ?? null)
}

export function npsScoreLabel(nps: number): string {
  if (nps >= 50) return 'Excelente'
  if (nps >= 30) return 'Bueno'
  if (nps >= 0) return 'Mejorable'
  return 'Crítico'
}

export function npsScoreClass(nps: number): string {
  if (nps >= 50) return 'text-emerald-600 dark:text-emerald-400'
  if (nps >= 30) return 'text-primary'
  if (nps >= 0) return 'text-amber-600 dark:text-amber-400'
  return 'text-destructive'
}
