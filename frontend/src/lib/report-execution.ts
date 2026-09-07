import { isApiEnabled } from '@/api/config'
import { executeFinancialStatementsApi, executeReportTableApi } from '@/api/reports'
import { buildNpsReportResult, type NpsReportResult } from '@/data/nps-report.mock'
import { emptyNpsReportResult } from '@/lib/production-empty-data'
import { runReportTable, resolveReportTableConfig } from '@/lib/report-table-run'
import type {
  FinancialStatementsManualLines,
  FinancialStatementsResult,
} from '@/types/financial-statements'
import type { ReportTableConfig, ReportTableRunResult } from '@/types/report-table'
import type { ReportItem, ReportTemplateId } from '@/types/reports-tree'

const RUN_DELAY_MS = 400

export function resolveReportTemplate(report: ReportItem): ReportTemplateId {
  if (report.templateId === 'nps-clientes') return 'nps-clientes'
  if (report.templateId === 'estados-financieros') return 'estados-financieros'
  if (report.templateId === 'tabla-dinamica' || report.tableConfig) {
    return 'tabla-dinamica'
  }
  return report.templateId ?? 'generic'
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
  | { templateId: 'estados-financieros'; data: FinancialStatementsResult }
  | { templateId: 'generic'; message: string }

function defaultPeriod(): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return { dateFrom: `${y}-01-01`, dateTo: `${y}-${m}-${d}` }
}

export async function executeReportTemplate(
  report: ReportItem,
  opts?: {
    financial?: {
      dateFrom: string
      dateTo: string
      manual?: FinancialStatementsManualLines
    }
  },
): Promise<ReportRunResult> {
  const templateId = resolveReportTemplate(report)
  await new Promise((resolve) => window.setTimeout(resolve, RUN_DELAY_MS))

  if (templateId === 'nps-clientes') {
    return {
      templateId: 'nps-clientes',
      data: isApiEnabled() ? emptyNpsReportResult() : buildNpsReportResult(),
    }
  }

  if (templateId === 'estados-financieros') {
    const period = opts?.financial ?? defaultPeriod()
    if (!isApiEnabled()) {
      return {
        templateId: 'estados-financieros',
        data: {
          meta: {
            companyName: 'Demo',
            taxId: '',
            dateFrom: period.dateFrom,
            dateTo: period.dateTo,
            currency: 'CLP',
            disclaimer:
              'Informe demo. Activa la API para datos reales del tenant.',
            balanced: false,
            gaps: ['Modo demo'],
          },
          incomeStatement: [],
          balanceSheet: [],
          annexes: {
            expensesByCategory: [],
            cxc: [],
            cxp: [],
            inventory: [],
            partners: [],
          },
          totals: {
            revenueCents: 0,
            netIncomeCents: 0,
            cxcCents: 0,
            cxpCents: 0,
            inventoryCents: 0,
            partnerCents: 0,
            totalAssetsCents: 0,
            totalLiabilitiesCents: 0,
            equityCents: 0,
          },
        },
      }
    }
    const data = await executeFinancialStatementsApi({
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      manual: opts?.financial?.manual,
    })
    return { templateId: 'estados-financieros', data }
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
    message: isApiEnabled()
      ? `No hay plantilla de ejecución configurada para «${report.name}».`
      : `Ejecución demo de «${report.name}» completada.`,
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
