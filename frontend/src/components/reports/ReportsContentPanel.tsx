import { ChevronRight, FileBarChart, Folder, Table2 } from 'lucide-react'

import { ReportExecutionPanel } from '@/components/reports/ReportExecutionPanel'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useReportsTree } from '@/hooks/use-reports-tree'
import {
  getChildFolders,
  getFolderPath,
  getFolderReports,
} from '@/lib/reports-tree'
import { cn } from '@/lib/utils'

export function ReportsContentPanel() {
  const {
    tree,
    selectFolder,
    selectReport,
    getSelectedFolder,
    getSelectedReport,
  } = useReportsTree()

  const folder = getSelectedFolder()
  const report = getSelectedReport()

  if (report) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
        <nav
          aria-label="Ubicación"
          className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
        >
          {getFolderPath(tree, report.folderId).map((f, i) => (
            <span key={f.id} className="inline-flex items-center gap-1">
              {i > 0 ? <ChevronRight aria-hidden className="size-3" /> : null}
              <button
                type="button"
                className="hover:text-foreground hover:underline"
                onClick={() => selectFolder(f.id)}
              >
                {f.name}
              </button>
            </span>
          ))}
          <ChevronRight aria-hidden className="size-3" />
          <span className="font-medium text-foreground">{report.name}</span>
        </nav>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-start gap-4 space-y-0">
            <div className="grid size-12 place-items-center rounded-xl border border-border bg-primary/10">
              <FileBarChart aria-hidden className="size-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl font-semibold">{report.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{report.reportType}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline">{report.author}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{report.description}</p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Última ejecución</dt>
                <dd className="mt-0.5 text-sm font-medium">{report.lastRun}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Actualizado</dt>
                <dd className="mt-0.5 text-sm font-medium">{report.updatedAt}</dd>
              </div>
            </dl>
            <ReportExecutionPanel report={report} />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (folder) {
    const childFolders = getChildFolders(tree, folder.id)
    const reports = getFolderReports(tree, folder.id)
    const path = getFolderPath(tree, folder.id)

    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
        <nav
          aria-label="Ubicación"
          className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
        >
          {path.map((f, i) => (
            <span key={f.id} className="inline-flex items-center gap-1">
              {i > 0 ? <ChevronRight aria-hidden className="size-3" /> : null}
              <button
                type="button"
                className={cn(
                  'hover:text-foreground hover:underline',
                  i === path.length - 1 && 'font-medium text-foreground',
                )}
                onClick={() => selectFolder(f.id)}
              >
                {f.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl border border-border bg-amber-500/10">
            <Folder aria-hidden className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{folder.name}</h2>
            <p className="text-sm text-muted-foreground">
              {childFolders.length} carpeta{childFolders.length === 1 ? '' : 's'} ·{' '}
              {reports.length} reporte{reports.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {childFolders.length === 0 && reports.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <Folder aria-hidden className="mb-3 size-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Carpeta vacía</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Crea una subcarpeta o un reporte con los botones de la barra superior.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full min-w-0 text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5">Nombre</th>
                  <th className="hidden px-4 py-2.5 sm:table-cell">Tipo</th>
                  <th className="hidden px-4 py-2.5 md:table-cell">Última ejecución</th>
                  <th className="px-4 py-2.5 text-end">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {childFolders.map((f) => (
                  <tr
                    key={f.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => selectFolder(f.id)}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 font-medium">
                        <Folder aria-hidden className="size-4 text-amber-500" />
                        {f.name}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      Carpeta
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">—</td>
                    <td className="px-4 py-3 text-end text-xs text-primary">Abrir</td>
                  </tr>
                ))}
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => selectReport(r.id)}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 font-medium">
                        <Table2 aria-hidden className="size-4 text-primary" />
                        {r.name}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {r.reportType}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {r.lastRun}
                    </td>
                    <td className="px-4 py-3 text-end text-xs text-primary">Ver</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-10 text-center text-muted-foreground">
      <Folder aria-hidden className="mb-3 size-10 opacity-50" />
      <p className="text-sm">Selecciona una carpeta o reporte en el panel izquierdo.</p>
    </div>
  )
}
