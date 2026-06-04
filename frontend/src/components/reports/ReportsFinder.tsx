import {
  ChevronsDownUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  FolderTree,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { isApiEnabled } from '@/api/config'
import { toast } from '@/lib/toast'

import { ReportFolderDialog } from '@/components/reports/ReportFolderDialog'
import { ReportItemDialog } from '@/components/reports/ReportItemDialog'
import { ReportsContentPanel } from '@/components/reports/ReportsContentPanel'
import { ReportsDeleteDialog } from '@/components/reports/ReportsDeleteDialog'
import { ReportsTreePanel } from '@/components/reports/ReportsTreePanel'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useReportsTree } from '@/hooks/use-reports-tree'
import { reportFormToInput, reportToFormValues } from '@/lib/report-item-form'
import { filterTreeByQuery } from '@/lib/reports-tree'
import { cn } from '@/lib/utils'

type DialogState =
  | { type: 'none' }
  | { type: 'folder-edit'; id: string; name: string }
  | { type: 'report-create' }
  | { type: 'report-edit'; id: string }
  | { type: 'delete-folder'; id: string; name: string }
  | { type: 'delete-report'; id: string; name: string }

const TREE_PANEL_WIDTH_PX = 320

export function ReportsFinder() {
  const {
    tree,
    query,
    setQuery,
    expandAllFolders,
    collapseAllFolders,
    selection,
    createFolder,
    updateFolder,
    deleteFolder,
    createReport,
    updateReport,
    deleteReport,
    getSelectedFolder,
    getSelectedReport,
    reloadFromApi,
  } = useReportsTree()

  useEffect(() => {
    if (!isApiEnabled()) return
    void reloadFromApi().catch(() => {})
  }, [reloadFromApi])

  const [dialog, setDialog] = useState<DialogState>({ type: 'none' })
  const [treeOpen, setTreeOpen] = useState(true)

  const filteredTree = useMemo(() => filterTreeByQuery(tree, query), [tree, query])

  const parentFolderId = useMemo(() => {
    if (selection?.kind === 'folder') return selection.id
    if (selection?.kind === 'report') {
      return tree.reports.find((r) => r.id === selection.id)?.folderId ?? null
    }
    return tree.folders.find((f) => f.parentId === null)?.id ?? null
  }, [selection, tree])

  const { canCreate, canEdit: canEditReports, canDelete: canDeleteReports } =
    useModulePermissions('reportes')

  const selectedFolder = getSelectedFolder()
  const selectedReport = getSelectedReport()
  const hasSelection =
    selection?.kind === 'folder'
      ? !!selectedFolder
      : selection?.kind === 'report'
        ? !!selectedReport
        : false
  const canRename = hasSelection && canEditReports
  const canRemove = hasSelection && canDeleteReports

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] min-w-0 flex-col">
      <header className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Reportes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Explorador de carpetas e informes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreate ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="shadow-sm">
                    <FolderPlus aria-hidden className="size-4" />
                    Carpeta
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      void (async () => {
                        const created = await createFolder({
                          name: 'Nueva carpeta',
                          parentId: parentFolderId,
                        })
                        if (created) {
                          setDialog({
                            type: 'folder-edit',
                            id: created.id,
                            name: created.name,
                          })
                          toast.success(`Carpeta creada. Renómbrala si lo necesitas.`)
                        }
                      })()
                    }}
                  >
                    {parentFolderId ? 'Subcarpeta aquí' : 'Nueva carpeta'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      void (async () => {
                        const created = await createFolder({
                          name: 'Nueva carpeta',
                          parentId: null,
                        })
                        if (created) {
                          setDialog({
                            type: 'folder-edit',
                            id: created.id,
                            name: created.name,
                          })
                          toast.success('Carpeta raíz creada.')
                        }
                      })()
                    }}
                  >
                    Carpeta en la raíz
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                size="sm"
                className="shadow-sm"
                disabled={!parentFolderId}
                onClick={() => setDialog({ type: 'report-create' })}
              >
                <Plus aria-hidden className="size-4" />
                Reporte
              </Button>
            </>
          ) : null}
          {canEditReports ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canRename}
            onClick={() => {
              if (selection?.kind === 'folder' && selectedFolder) {
                setDialog({
                  type: 'folder-edit',
                  id: selectedFolder.id,
                  name: selectedFolder.name,
                })
              } else if (selection?.kind === 'report' && selectedReport) {
                setDialog({ type: 'report-edit', id: selectedReport.id })
              }
            }}
          >
            <Pencil aria-hidden className="size-4" />
            Renombrar
          </Button>
          ) : null}
          {canDeleteReports ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canRemove}
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (selection?.kind === 'folder' && selectedFolder) {
                setDialog({
                  type: 'delete-folder',
                  id: selectedFolder.id,
                  name: selectedFolder.name,
                })
              } else if (selection?.kind === 'report' && selectedReport) {
                setDialog({
                  type: 'delete-report',
                  id: selectedReport.id,
                  name: selectedReport.name,
                })
              }
            }}
          >
            <Trash2 aria-hidden className="size-4" />
            Eliminar
          </Button>
          ) : null}
        </div>
      </header>

      <div className="relative flex min-h-0 min-w-0 flex-1">
        <div className="relative flex h-full shrink-0">
          <button
            type="button"
            aria-expanded={treeOpen}
            aria-controls="reports-tree-panel"
            aria-label={
              treeOpen ? 'Ocultar árbol de carpetas' : 'Mostrar árbol de carpetas'
            }
            title={
              treeOpen ? 'Ocultar árbol de carpetas' : 'Mostrar árbol de carpetas'
            }
            onClick={() => setTreeOpen((open) => !open)}
            className={cn(
              'absolute top-[42%] z-30 flex -translate-y-1/2 items-center justify-center',
              'rounded-full border shadow-md transition-all duration-300',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              treeOpen
                ? '-right-4 size-8 border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                : 'relative right-0 flex h-14 w-9 translate-x-full flex-col gap-0.5 rounded-r-lg rounded-l-none border-primary/50 bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/35 hover:bg-primary/90',
            )}
          >
            {treeOpen ? (
              <ChevronLeft aria-hidden className="size-4" />
            ) : (
              <>
                <FolderTree aria-hidden className="size-4 shrink-0" />
                <ChevronRight aria-hidden className="size-4 shrink-0" />
              </>
            )}
          </button>

          <aside
            id="reports-tree-panel"
            aria-hidden={!treeOpen}
            className={cn(
              'flex h-full min-h-0 flex-col overflow-hidden border-r bg-card',
              'transition-[width,border-color] duration-300 ease-in-out',
              treeOpen ? 'border-border' : 'border-transparent',
            )}
            style={{ width: treeOpen ? TREE_PANEL_WIDTH_PX : 0 }}
          >
            <div
              className="flex h-full min-h-0 flex-col"
              style={{ width: TREE_PANEL_WIDTH_PX }}
            >
              <div className="border-b border-border p-3">
                <div className="relative">
                  <Search
                    aria-hidden
                    className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    aria-label="Buscar carpetas y reportes"
                    className="h-9 bg-card ps-9 shadow-sm"
                    placeholder="Buscar…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    Árbol de carpetas
                  </span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() =>
                        expandAllFolders(filteredTree.folders.map((f) => f.id))
                      }
                    >
                      <ChevronsDownUp aria-hidden className="size-3.5" />
                      Expandir
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={collapseAllFolders}
                    >
                      <ChevronsUpDown aria-hidden className="size-3.5" />
                      Contraer
                    </Button>
                  </div>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                <ReportsTreePanel />
              </div>
            </div>
          </aside>
        </div>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-muted/15">
          <ReportsContentPanel />
        </main>
      </div>

      <ReportFolderDialog
        open={dialog.type === 'folder-edit'}
        onOpenChange={(open) => !open && setDialog({ type: 'none' })}
        mode="edit"
        initialName={dialog.type === 'folder-edit' ? dialog.name : ''}
        onSubmit={(name) => {
          if (dialog.type !== 'folder-edit') return
          void (async () => {
            if (await updateFolder(dialog.id, name)) toast.success('Carpeta actualizada.')
          })()
        }}
      />

      <ReportItemDialog
        open={dialog.type === 'report-create'}
        onOpenChange={(open) => !open && setDialog({ type: 'none' })}
        mode="create"
        folders={tree.folders}
        defaultFolderId={parentFolderId ?? tree.folders[0]?.id ?? ''}
        onSubmit={(values) => {
          void (async () => {
            const created = await createReport(reportFormToInput(values))
            if (created) toast.success(`Reporte «${created.name}» creado.`)
          })()
        }}
      />

      <ReportItemDialog
        open={dialog.type === 'report-edit'}
        onOpenChange={(open) => !open && setDialog({ type: 'none' })}
        mode="edit"
        folders={tree.folders}
        defaultFolderId={parentFolderId ?? ''}
        initialValues={
          dialog.type === 'report-edit'
            ? (() => {
                const r = tree.reports.find((item) => item.id === dialog.id)
                return r ? reportToFormValues(r) : undefined
              })()
            : undefined
        }
        onSubmit={(values) => {
          if (dialog.type !== 'report-edit') return
          void (async () => {
            if (await updateReport(dialog.id, reportFormToInput(values)))
              toast.success('Reporte actualizado.')
          })()
        }}
      />

      <ReportsDeleteDialog
        open={dialog.type === 'delete-folder'}
        onOpenChange={(open) => !open && setDialog({ type: 'none' })}
        title="Eliminar carpeta"
        description={
          dialog.type === 'delete-folder'
            ? `¿Eliminar la carpeta «${dialog.name}»? Debe estar vacía.`
            : ''
        }
        onConfirm={() => {
          if (dialog.type !== 'delete-folder') return
          void (async () => {
            const result = await deleteFolder(dialog.id)
            if (result.ok) toast.success('Carpeta eliminada.')
            else toast.warning(result.error)
          })()
        }}
      />

      <ReportsDeleteDialog
        open={dialog.type === 'delete-report'}
        onOpenChange={(open) => !open && setDialog({ type: 'none' })}
        title="Eliminar reporte"
        description={
          dialog.type === 'delete-report'
            ? `¿Eliminar el reporte «${dialog.name}»? Esta acción no se puede deshacer.`
            : ''
        }
        onConfirm={() => {
          if (dialog.type !== 'delete-report') return
          void (async () => {
            if (await deleteReport(dialog.id)) toast.success('Reporte eliminado.')
          })()
        }}
      />
    </div>
  )
}
