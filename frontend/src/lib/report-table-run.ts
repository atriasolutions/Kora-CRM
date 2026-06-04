import {
  getDefaultColumnIds,
  getReportDataSourceFields,
  getReportDataSourceRows,
} from '@/lib/report-data-sources'
import { filterReportRows } from '@/lib/report-filter-engine'
import {
  createDefaultReportTableConfig,
  type ReportTableConfig,
  type ReportTableRunResult,
} from '@/types/report-table'

/** Quita columnIds inválidos sin rellenar por defecto (estado del editor). */
export function sanitizeReportTableConfigColumns(
  config: ReportTableConfig,
): ReportTableConfig {
  const validFieldIds = new Set(
    getReportDataSourceFields(config.dataSource, config.joinId).map((f) => f.id),
  )
  const columnIds = config.columnIds.filter((id) => validFieldIds.has(id))
  if (
    columnIds.length === config.columnIds.length &&
    columnIds.every((id, i) => id === config.columnIds[i])
  ) {
    return config
  }
  return { ...config, columnIds }
}

export function resolveReportTableConfig(
  config?: ReportTableConfig | null,
): ReportTableConfig {
  const base = createDefaultReportTableConfig(config ?? undefined)
  const sanitized = sanitizeReportTableConfigColumns(base)
  if (sanitized.columnIds.length > 0) {
    return sanitized
  }
  return {
    ...sanitized,
    columnIds: getDefaultColumnIds(sanitized.dataSource, sanitized.joinId),
  }
}

export function runReportTable(
  config: ReportTableConfig,
): ReportTableRunResult & { filterError?: string } {
  const resolved = resolveReportTableConfig(config)
  const allFields = getReportDataSourceFields(resolved.dataSource, resolved.joinId)
  const columns = resolved.columnIds
    .map((id) => allFields.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => Boolean(f))

  const allRows = getReportDataSourceRows(resolved.dataSource, resolved.joinId)
  const { rows: filtered, error } = filterReportRows(
    allRows,
    resolved.conditions,
    resolved.combineMode,
    resolved.customExpression,
  )

  const visibleRows = filtered.map((row) => {
    const out: Record<string, string> = {}
    for (const col of columns) {
      out[col.id] = row[col.id] ?? ''
    }
    return out
  })

  return {
    columns,
    rows: visibleRows,
    totalBeforeFilter: allRows.length,
    filterError: error,
  }
}
