import { Download, Table2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { downloadReportAsExcel } from '@/lib/report-excel-export'
import type { ReportTableRunResult } from '@/types/report-table'

type DynamicReportTableViewProps = {
  reportName: string
  result: ReportTableRunResult
  filterError?: string
}

export function DynamicReportTableView({
  reportName,
  result,
  filterError,
}: DynamicReportTableViewProps) {
  const handleExport = () => {
    downloadReportAsExcel(reportName, result.columns, result.rows)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <Table2 aria-hidden className="mr-1.5 inline size-4" />
          {result.rows.length} fila{result.rows.length === 1 ? '' : 's'}
          {result.totalBeforeFilter !== result.rows.length
            ? ` (de ${result.totalBeforeFilter} en la fuente)`
            : null}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={result.rows.length === 0 || result.columns.length === 0}
          onClick={handleExport}
        >
          <Download aria-hidden className="size-4" />
          Exportar Excel
        </Button>
      </div>

      {filterError ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
          {filterError}
        </p>
      ) : null}

      {result.columns.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Selecciona al menos una columna en la configuración.
        </p>
      ) : (
        <div className="overflow-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {result.columns.map((col) => (
                  <th
                    key={col.id}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={result.columns.length}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Ninguna fila coincide con los filtros.
                  </td>
                </tr>
              ) : (
                result.rows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="transition-colors hover:bg-muted/30"
                  >
                    {result.columns.map((col) => (
                      <td
                        key={col.id}
                        className="max-w-[280px] truncate whitespace-nowrap px-3 py-2 text-foreground"
                        title={row[col.id]}
                      >
                        {row[col.id] || '—'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
