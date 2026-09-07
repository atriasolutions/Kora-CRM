import { CheckCircle2, Loader2, Play, Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'

import { DynamicReportTableView } from '@/components/reports/executions/DynamicReportTableView'
import { FinancialStatementsReportView } from '@/components/reports/executions/FinancialStatementsReportView'
import { ReportTableConfigEditor } from '@/components/reports/ReportTableConfigEditor'
import { Button } from '@/components/ui/button'
import { apiActionErrorMessage } from '@/api/errors'
import { useReportsTree } from '@/hooks/use-reports-tree'
import {
  executeReportTemplate,
  formatReportLastRun,
  getReportTableConfig,
  resolveReportTemplate,
  type ReportRunResult,
} from '@/lib/report-execution'
import { validateCustomExpression } from '@/lib/report-filter-engine'
import type { FinancialStatementsManualLines } from '@/types/financial-statements'
import type { ReportTableConfig } from '@/types/report-table'
import type { ReportItem } from '@/types/reports-tree'
import { cn } from '@/lib/utils'

type ReportExecutionPanelProps = {
  report: ReportItem
}

function defaultFfPeriod() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return { dateFrom: `${y}-01-01`, dateTo: `${y}-${m}-${d}` }
}

export function ReportExecutionPanel({ report }: ReportExecutionPanelProps) {
  const { recordReportRun, updateReportTableConfig } = useReportsTree()
  const templateId = resolveReportTemplate(report)
  const isFinancial = templateId === 'estados-financieros'
  const isTable = templateId === 'tabla-dinamica'

  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<ReportRunResult | null>(null)
  const [tableConfig, setTableConfig] = useState<ReportTableConfig>(() =>
    getReportTableConfig(report),
  )
  const [ffPeriod, setFfPeriod] = useState(defaultFfPeriod)
  const [ffManual, setFfManual] = useState<FinancialStatementsManualLines>({})

  useEffect(() => {
    queueMicrotask(() => {
      setResult(null)
      setIsRunning(false)
      setTableConfig(getReportTableConfig(report))
    })
  }, [report.id, report.tableConfig, report.templateId])

  const configValid = useMemo(() => {
    if (isFinancial) return true
    if (tableConfig.columnIds.length === 0) return false
    if (
      tableConfig.combineMode === 'custom' &&
      tableConfig.conditions.length > 0
    ) {
      return (
        validateCustomExpression(
          tableConfig.customExpression,
          tableConfig.conditions.length,
        ) === null
      )
    }
    return true
  }, [tableConfig, isFinancial])

  const handleSaveConfig = useCallback(async () => {
    if (!isTable) return
    if (tableConfig.columnIds.length === 0) {
      toast.warning('Selecciona al menos una columna.')
      return
    }
    if (
      tableConfig.combineMode === 'custom' &&
      tableConfig.conditions.length > 0
    ) {
      const err = validateCustomExpression(
        tableConfig.customExpression,
        tableConfig.conditions.length,
      )
      if (err) {
        toast.warning(err)
        return
      }
    }
    await updateReportTableConfig(report.id, tableConfig)
    toast.success('Configuración del reporte guardada.')
  }, [report.id, tableConfig, updateReportTableConfig, isTable])

  const handleRun = useCallback(async () => {
    if (!configValid) {
      toast.warning('Revisa columnas y la expresión de filtros antes de ejecutar.')
      return
    }
    setIsRunning(true)
    setResult(null)
    try {
      const reportForRun: ReportItem = isTable
        ? { ...report, tableConfig, templateId: 'tabla-dinamica' }
        : report
      const output = await executeReportTemplate(
        reportForRun,
        isFinancial
          ? { financial: { ...ffPeriod, manual: ffManual } }
          : undefined,
      )
      setResult(output)
      if (output.templateId === 'tabla-dinamica' && output.filterError) {
        toast.warning(output.filterError)
      } else {
        await recordReportRun(report.id, formatReportLastRun(new Date()))
      }
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo ejecutar el reporte.'))
    } finally {
      setIsRunning(false)
    }
  }, [
    configValid,
    report,
    tableConfig,
    recordReportRun,
    isTable,
    isFinancial,
    ffPeriod,
    ffManual,
  ])

  return (
    <div className="space-y-4">
      {isTable ? (
        <ReportTableConfigEditor config={tableConfig} onChange={setTableConfig} />
      ) : null}

      {isFinancial ? (
        <p className="text-sm text-muted-foreground">
          Estado de resultados por función y estado de situación financiera (formato Chile /
          NIIF). Completa líneas manuales y exporta a Excel con anexos CxC/CxP.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {isTable ? (
          <Button type="button" size="sm" variant="outline" onClick={handleSaveConfig}>
            <Save aria-hidden className="size-4" />
            Guardar configuración
          </Button>
        ) : null}
        <Button
          size="sm"
          className="shadow-sm"
          disabled={isRunning || !configValid}
          onClick={() => void handleRun()}
        >
          {isRunning ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Play aria-hidden className="size-4" />
          )}
          {isRunning ? 'Ejecutando…' : 'Ejecutar'}
        </Button>
        <span className="text-xs text-muted-foreground">
          {isFinancial
            ? 'Informe EE.FF. de apoyo al contador.'
            : 'Tabla dinámica con filtros Y / O y exportación a Excel.'}
        </span>
        {result?.templateId === 'tabla-dinamica' && !isRunning && !result.filterError ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 aria-hidden className="size-3.5" />
            {result.data.rows.length} fila{result.data.rows.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {isRunning ? (
        <div
          className={cn(
            'flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-8',
          )}
        >
          <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Generando reporte…</p>
        </div>
      ) : null}

      {!isRunning && result?.templateId === 'tabla-dinamica' ? (
        <DynamicReportTableView
          reportName={report.name}
          result={result.data}
          filterError={result.filterError}
        />
      ) : null}

      {!isRunning && result?.templateId === 'estados-financieros' ? (
        <FinancialStatementsReportView
          result={result.data}
          dateFrom={ffPeriod.dateFrom}
          dateTo={ffPeriod.dateTo}
          isRunning={isRunning}
          onPeriodChange={(dateFrom, dateTo) => setFfPeriod({ dateFrom, dateTo })}
          onManualChange={(manual) => setFfManual((prev) => ({ ...prev, ...manual }))}
          onRerun={() => void handleRun()}
        />
      ) : null}

      {!isRunning && result?.templateId === 'generic' ? (
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          {result.message}
        </div>
      ) : null}

      {!isRunning && !result ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <Play aria-hidden className="mb-3 size-10 text-muted-foreground opacity-60" />
          <p className="text-sm font-medium text-foreground">Listo para ejecutar</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {isFinancial
              ? 'Pulsa Ejecutar para armar el estado de resultados y el balance al corte.'
              : 'Configura columnas y filtros, guarda si quieres, y pulsa Ejecutar.'}
          </p>
        </div>
      ) : null}
    </div>
  )
}
