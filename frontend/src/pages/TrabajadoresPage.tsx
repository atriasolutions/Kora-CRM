import { Archive, Plus, RotateCcw, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { CreateWorkerDialog } from '@/components/trabajadores/CreateWorkerDialog'
import { EditWorkerDialog } from '@/components/trabajadores/EditWorkerDialog'
import { ListPageLayout } from '@/components/list/ListPageLayout'
import { ModuleListPage, type ListSelectionAction } from '@/components/list/ModuleListPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { trabajadoresListConfig } from '@/config/list-modules/trabajadores'
import { isApiEnabled } from '@/api/config'
import { loadWorkerDetail } from '@/lib/entity-detail-loaders'
import type { WorkerDetail, WorkerListItem } from '@/data/workers.mock'
import {
  WORKER_CONTRACT_TYPE_OPTIONS,
  WORKER_STATUS_OPTIONS,
} from '@/data/workers.mock'
import { apiActionErrorMessage } from '@/api/errors'
import { useWorkersRegistry } from '@/hooks/use-workers-registry'
import { fetchWorkersServerPage } from '@/lib/module-server-list'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import type { WorkerFormValues } from '@/lib/worker-form'
import {
  createDefaultWorkerFilters,
  workerFiltersToServerQuery,
  workerRowMatchesFilters,
  type WorkerFilters,
} from '@/lib/worker-filters'
import { toast } from '@/lib/toast'

type WorkerView = 'lista' | 'archivados'

export function TrabajadoresPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { canEdit, canDelete, canCreate } = useModulePermissions('trabajadores')
  const {
    allWorkers,
    archivedWorkers,
    addWorker,
    updateWorkerFromDetail,
    archiveWorker,
    archiveWorkers,
    restoreWorker,
    isArchived,
    reloadFromApi,
  } = useWorkersRegistry()

  const [view, setView] = useState<WorkerView>('lista')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<WorkerFilters>(() => createDefaultWorkerFilters())
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingWorker, setEditingWorker] = useState<WorkerDetail | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<WorkerListItem | null>(null)
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null)

  const serverListQuery = useMemo(() => workerFiltersToServerQuery(filters), [filters])
  const filtersOnServer = isApiEnabled()

  const rowPredicate = useMemo(
    () => (row: WorkerListItem) => workerRowMatchesFilters(row, filters) && !isArchived(row.id),
    [filters, isArchived],
  )

  useEffect(() => {
    if (location.pathname === '/trabajadores') setListRefreshKey((k) => k + 1)
  }, [location.pathname, location.key])

  useEffect(() => {
    if (isApiEnabled()) void reloadFromApi().catch(() => {})
  }, [reloadFromApi])

  const handleCreateSubmit = useCallback(
    async (values: WorkerFormValues) => {
      try {
        const item = await addWorker(values)
        toast.success(`Trabajador «${item.fullName}» creado.`)
        navigate(`/trabajadores/${item.id}`)
      } catch (error) {
        toast.error(apiActionErrorMessage(error, 'No se pudo crear el trabajador.'))
      }
    },
    [addWorker, navigate],
  )

  const openEdit = useCallback(async (row: WorkerListItem) => {
    try {
      setEditingWorker(await loadWorkerDetail(row.id))
      setEditOpen(true)
    } catch {
      toast.error('No se pudo cargar el trabajador.')
    }
  }, [])

  const handleEditSaved = useCallback(
    async (updated: WorkerDetail) => {
      try {
        await updateWorkerFromDetail(updated)
        setListRefreshKey((k) => k + 1)
        toast.success(`Trabajador «${updated.fullName}» actualizado.`)
      } catch {
        toast.error('No se pudo actualizar el trabajador.')
      }
    },
    [updateWorkerFromDetail],
  )

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    const name = archiveTarget.fullName
    try {
      await archiveWorker(archiveTarget.id)
      setArchiveTarget(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`Trabajador «${name}» archivado.`)
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo archivar el trabajador.'))
    }
  }, [archiveWorker, archiveTarget])

  const handleBulkArchive = useCallback(async () => {
    if (!bulkArchiveIds?.length) return
    const count = bulkArchiveIds.length
    try {
      await archiveWorkers(bulkArchiveIds)
      setBulkArchiveIds(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`${count} trabajador${count === 1 ? '' : 'es'} archivado${count === 1 ? '' : 's'}.`)
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudieron archivar.'))
    }
  }, [archiveWorkers, bulkArchiveIds])

  const handleRestore = useCallback(
    async (id: string) => {
      try {
        await restoreWorker(id)
        toast.success('Trabajador restaurado.')
      } catch (error) {
        toast.error(apiActionErrorMessage(error, 'No se pudo restaurar.'))
      }
    },
    [restoreWorker],
  )

  const selectionActions = useMemo<ListSelectionAction[]>(() => {
    const actions: ListSelectionAction[] = []
    if (canDelete) {
      actions.push({
        label: 'Archivar',
        icon: Archive,
        variant: 'destructive',
        onClick: (ids) => setBulkArchiveIds(ids),
      })
    }
    return actions
  }, [canDelete])

  const header = (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {trabajadoresListConfig.title}
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground md:block">
            {view === 'archivados'
              ? 'Trabajadores archivados: restaura o consulta fichas antiguas.'
              : trabajadoresListConfig.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => setView('lista')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === 'lista' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
            >
              Lista
            </button>
            <button
              type="button"
              onClick={() => setView('archivados')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === 'archivados' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
            >
              Archivados ({archivedWorkers.length})
            </button>
          </div>
          {view === 'lista' && canCreate ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden className="size-4" />
              <span className="hidden md:inline">{trabajadoresListConfig.newItemLabel}</span>
            </Button>
          ) : null}
        </div>
      </div>

      {view === 'lista' ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar trabajadores…"
              className="h-9 bg-card ps-9 shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <ContactFormSelect
              id="filter-status"
              label=""
              value={filters.statuses[0] ?? ''}
              onChange={(v) =>
                setFilters((f) => ({ ...f, statuses: v ? [v as WorkerFilters['statuses'][number]] : [] }))
              }
              options={[{ value: '', label: 'Todos los estados' }, ...WORKER_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))]}
              className="w-44"
            />
            <ContactFormSelect
              id="filter-contract"
              label=""
              value={filters.contractTypes[0] ?? ''}
              onChange={(v) =>
                setFilters((f) => ({ ...f, contractTypes: v ? [v as WorkerFilters['contractTypes'][number]] : [] }))
              }
              options={[{ value: '', label: 'Todos los contratos' }, ...WORKER_CONTRACT_TYPE_OPTIONS.map((c) => ({ value: c, label: c }))]}
              className="w-44"
            />
          </div>
        </div>
      ) : null}
    </section>
  )

  const archivedFiltered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return archivedWorkers
    return archivedWorkers.filter((w) => trabajadoresListConfig.searchFilter(w, q))
  }, [archivedWorkers, query])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ListPageLayout header={header}>
        {view === 'lista' ? (
          <ModuleListPage
            config={trabajadoresListConfig}
            embedded
            searchQuery={query}
            serverList={{
              fetchPage: (params) => fetchWorkersServerPage(params, false, serverListQuery),
              resetKey: `${listRefreshKey}-${JSON.stringify(serverListQuery)}`,
              filtersOnServer,
            }}
            extraSeeds={isApiEnabled() ? [] : allWorkers}
            rowPredicate={rowPredicate}
            onEditRow={canEdit ? openEdit : undefined}
            onArchiveRow={canDelete ? (row) => setArchiveTarget(row) : undefined}
            selectionActions={selectionActions}
            clearSelectionKey={listRefreshKey}
          />
        ) : (
          <div className="min-w-0 space-y-3">
            {archivedFiltered.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                No hay trabajadores archivados.
              </p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {archivedFiltered.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{w.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {w.jobTitle || '—'} · {w.number}
                      </p>
                    </div>
                    {canDelete ? (
                      <Button type="button" size="sm" variant="outline" className="border-border" onClick={() => handleRestore(w.id)}>
                        <RotateCcw aria-hidden className="size-4" />
                        Restaurar
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </ListPageLayout>

      <CreateWorkerDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={handleCreateSubmit} />

      {canEdit && editingWorker ? (
        <EditWorkerDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) setEditingWorker(null)
          }}
          worker={editingWorker}
          onSave={handleEditSaved}
        />
      ) : null}

      <Dialog open={archiveTarget !== null} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar trabajador</DialogTitle>
            <DialogDescription>
              {archiveTarget ? `«${archiveTarget.fullName}» se moverá a Archivados.` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setArchiveTarget(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleArchiveConfirm}>
              Archivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkArchiveIds !== null && bulkArchiveIds.length > 0} onOpenChange={(open) => !open && setBulkArchiveIds(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar {bulkArchiveIds?.length ?? 0} trabajador{bulkArchiveIds && bulkArchiveIds.length === 1 ? '' : 'es'}</DialogTitle>
            <DialogDescription>Los seleccionados se moverán a Archivados.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setBulkArchiveIds(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleBulkArchive}>
              Archivar selección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
