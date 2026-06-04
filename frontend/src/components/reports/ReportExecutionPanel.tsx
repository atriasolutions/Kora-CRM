import { CheckCircle2, Loader2, Play, Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'

import { DynamicReportTableView } from '@/components/reports/executions/DynamicReportTableView'
import { ReportTableConfigEditor } from '@/components/reports/ReportTableConfigEditor'
import { Button } from '@/components/ui/button'
import { apiActionErrorMessage } from '@/api/errors'
import { useReportsTree } from '@/hooks/use-reports-tree'
import {
  executeReportTemplate,
  formatReportLastRun,
  getReportTableConfig,
  type ReportRunResult,
} from '@/lib/report-execution'
import { validateCustomExpression } from '@/lib/report-filter-engine'
import type { ReportTableConfig } from '@/types/report-table'
import type { ReportItem } from '@/types/reports-tree'
import { cn } from '@/lib/utils'

type ReportExecutionPanelProps = {
  report: ReportItem
}

export function ReportExecutionPanel({ report }: ReportExecutionPanelProps) {
  const { recordReportRun, updateReportTableConfig } = useReportsTree()
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<ReportRunResult | null>(null)
  const [tableConfig, setTableConfig] = useState<ReportTableConfig>(() =>
    getReportTableConfig(report),
  )

  useEffect(() => {
    queueMicrotask(() => {
      setResult(null)
      setIsRunning(false)
      setTableConfig(getReportTableConfig(report))
    })
  }, [report.id, report.tableConfig])

  const configValid = useMemo(() => {
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
  }, [tableConfig])

  const handleSaveConfig = useCallback(async () => {
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
  }, [report.id, tableConfig, updateReportTableConfig])

  const handleRun = useCallback(async () => {
    if (!configValid) {
      toast.warning('Revisa columnas y la expresión de filtros antes de ejecutar.')
      return
    }
    setIsRunning(true)
    setResult(null)
    try {
      const reportForRun: ReportItem = { ...report, tableConfig, templateId: 'tabla-dinamica' }
      const output = await executeReportTemplate(reportForRun)
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
  }, [configValid, report, tableConfig, recordReportRun])

  return (
    <div className="space-y-4">
      <ReportTableConfigEditor config={tableConfig} onChange={setTableConfig} />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" variant="outline" onClick={handleSaveConfig}>
          <Save aria-hidden className="size-4" />
          Guardar configuración
        </Button>
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
          Tabla dinámica con filtros Y / O y exportación a Excel.
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
          <p className="text-xs text-muted-foreground">
            Aplicando filtros y armando la tabla
          </p>
        </div>
      ) : null}

      {!isRunning && result?.templateId === 'tabla-dinamica' ? (
        <DynamicReportTableView
          reportName={report.name}
          result={result.data}
          filterError={result.filterError}
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
            Configura columnas y filtros, guarda si quieres, y pulsa Ejecutar. Luego exporta a Excel.
          </p>
        </div>
      ) : null}
    </div>
  )
}
