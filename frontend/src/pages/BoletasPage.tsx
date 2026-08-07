import { Archive, Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { updateBoletaApi } from '@/api/boletas'
import { BoletasArchivedView } from '@/components/boletas/BoletasArchivedView'
import { BoletasModuleHeader } from '@/components/boletas/BoletasModuleHeader'
import { BoletasSegmentsView } from '@/components/boletas/BoletasSegmentsView'
import { CreateBoletaDialog } from '@/components/boletas/CreateBoletaDialog'
import { EditBoletaDialog } from '@/components/boletas/EditBoletaDialog'
import { BulkEditDialog } from '@/components/list/BulkEditDialog'
import { ListPageLayout } from '@/components/list/ListPageLayout'
import { ModuleListPage, type ListSelectionAction } from '@/components/list/ModuleListPage'
import { useEmbeddedListToolbarSlot } from '@/hooks/use-embedded-list-toolbar-slot'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { boletasListConfig } from '@/config/list-modules/boletas'
import type { BoletaDetail } from '@/data/boleta-detail.mock'
import { isApiEnabled } from '@/api/config'
import { resolveBoletaListItem } from '@/data/boleta-detail.mock'
import { loadBoletaDetail } from '@/lib/entity-detail-loaders'
import type { BoletaListItem } from '@/data/boletas.mock'
import { apiActionErrorMessage } from '@/api/errors'
import { useBoletasRegistry } from '@/hooks/use-boletas-registry'
import { fetchBoletasServerPage } from '@/lib/module-server-list'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import type { CreateBoletaFormValues } from '@/lib/boleta-create'
import {
  BOLETA_PAYMENT_METHOD_OPTIONS,
  BOLETA_STATUS_OPTIONS,
  boletaFiltersToServerQuery,
  boletaRowMatchesFilters,
  createDefaultBoletaFilters,
  type BoletaFilters,
} from '@/lib/boleta-filters'
import { BOLETA_ARCHIVE_RETENTION_DAYS } from '@/lib/boleta-archive'
import { withResolvedBoletaListStatus } from '@/lib/boleta-display'
import {
  boletaMatchesListScope,
  loadBoletaRecentIds,
  sortBoletasByRecentlyViewed,
  type BoletaListScope,
} from '@/lib/boleta-list-scope'
import { getCurrentUser } from '@/lib/current-user'
import type { BoletasModuleViewId } from '@/lib/module-list-views'

export function BoletasPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { canEdit, canDelete } = useModulePermissions('boletas')
  const {
    allBoletas,
    addBoleta,
    updateBoletaFromDetail,
    archiveBoleta,
    archiveBoletas,
    archivedBoletas,
    isArchived,
    reloadFromApi,
  } = useBoletasRegistry()

  const [view, setView] = useState<BoletasModuleViewId>('lista')
  const [listScope, setListScope] = useState<BoletaListScope>('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<BoletaFilters>(() => createDefaultBoletaFilters())
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()

  const recentIds = useMemo(
    () => loadBoletaRecentIds(),
    [listRefreshKey, location.key, listScope],
  )

  const serverListQuery = useMemo(
    () =>
      boletaFiltersToServerQuery(filters, {
        mine: listScope === 'mine',
        ownerName: getCurrentUser().name,
      }),
    [filters, listScope],
  )

  const filtersOnServer = listScope !== 'recent' && isApiEnabled()

  const rowPredicate = useMemo(
    () => (row: BoletaListItem) =>
      boletaRowMatchesFilters(row, filters) &&
      !isArchived(row.id) &&
      boletaMatchesListScope(row, listScope, recentIds),
    [filters, isArchived, listScope, recentIds],
  )

  const postFilterSort = useMemo(() => {
    if (listScope !== 'recent') return undefined
    return (rows: BoletaListItem[]) => sortBoletasByRecentlyViewed(rows, recentIds)
  }, [listScope, recentIds])

  useEffect(() => {
    if (location.pathname === '/boletas') {
      setListRefreshKey((k) => k + 1)
    }
  }, [location.pathname, location.key])

  useEffect(() => {
    if (!isApiEnabled()) return
    if (view !== 'lista' || listScope === 'recent') {
      void reloadFromApi().catch(() => {})
    }
  }, [view, listScope, reloadFromApi])

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingBoleta, setEditingBoleta] = useState<BoletaDetail | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<BoletaListItem | null>(null)
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null)
  const [bulkEditIds, setBulkEditIds] = useState<string[] | null>(null)
  const [bulkEditSaving, setBulkEditSaving] = useState(false)

  const handleCreateSubmit = useCallback(
    async (values: CreateBoletaFormValues) => {
      try {
        const item = await addBoleta(values)
        toast.success(`Boleta «${item.number}» creada correctamente.`)
        navigate(`/boletas/${item.id}`)
      } catch (error) {
        toast.error(apiActionErrorMessage(error, 'No se pudo crear la boleta.'))
      }
    },
    [addBoleta, navigate],
  )

  const resolveListRow = useCallback(
    (row: BoletaListItem) => {
      const base = isApiEnabled() ? row : resolveBoletaListItem(row.id)
      return withResolvedBoletaListStatus(base)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listRefreshKey],
  )

  const openEditBoleta = useCallback(async (row: BoletaListItem) => {
    try {
      setEditingBoleta(await loadBoletaDetail(row.id))
      setEditOpen(true)
    } catch {
      toast.error('No se pudo cargar la boleta.')
    }
  }, [])

  const handleEditSaved = useCallback(
    async (updated: BoletaDetail) => {
      try {
        await updateBoletaFromDetail(updated)
        setListRefreshKey((k) => k + 1)
        toast.success(`Boleta «${updated.number}» actualizada correctamente.`)
      } catch {
        toast.error('No se pudo actualizar la boleta.')
      }
    },
    [updateBoletaFromDetail],
  )

  const openArchiveBoleta = useCallback((row: BoletaListItem) => {
    setArchiveTarget(row)
  }, [])

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    const number = archiveTarget.number
    try {
      await archiveBoleta(archiveTarget.id)
      setArchiveTarget(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`Boleta «${number}» archivada.`)
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo archivar la boleta.'))
    }
  }, [archiveBoleta, archiveTarget])

  const handleBulkArchiveConfirm = useCallback(async () => {
    if (!bulkArchiveIds?.length) return
    const count = bulkArchiveIds.length
    try {
      await archiveBoletas(bulkArchiveIds)
      setBulkArchiveIds(null)
      setListRefreshKey((k) => k + 1)
      toast.success(
        `${count} boleta${count === 1 ? '' : 's'} archivada${count === 1 ? '' : 's'}.`,
      )
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudieron archivar las boletas.'))
    }
  }, [archiveBoletas, bulkArchiveIds])

  const handleBulkEdit = useCallback(
    async (patch: Record<string, string>) => {
      if (!bulkEditIds?.length) return
      setBulkEditSaving(true)
      let ok = 0
      let fail = 0
      try {
        for (const id of bulkEditIds) {
          try {
            await updateBoletaApi(id, {
              status: patch.status,
              ownerName: patch.ownerName,
              paymentMethod: patch.paymentMethod,
            })
            ok += 1
          } catch {
            fail += 1
          }
        }
        setBulkEditIds(null)
        setListRefreshKey((k) => k + 1)
        void reloadFromApi().catch(() => {})
        if (fail === 0) {
          toast.success(`${ok} boleta${ok === 1 ? '' : 's'} actualizada${ok === 1 ? '' : 's'}.`)
        } else {
          toast.warning(`${ok} actualizadas, ${fail} con error.`)
        }
      } finally {
        setBulkEditSaving(false)
      }
    },
    [bulkEditIds, reloadFromApi],
  )

  const listSelectionActions = useMemo<ListSelectionAction[]>(() => {
    const actions: ListSelectionAction[] = []
    if (canEdit) {
      actions.push({
        label: 'Editar',
        icon: Pencil,
        onClick: (ids) => setBulkEditIds(ids),
      })
    }
    if (canDelete) {
      actions.push({
        label: 'Archivar',
        icon: Archive,
        variant: 'destructive',
        onClick: (ids) => setBulkArchiveIds(ids),
      })
    }
    return actions
  }, [canDelete, canEdit])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ListPageLayout
        header={
          <BoletasModuleHeader
            view={view}
            onViewChange={setView}
            query={query}
            onQueryChange={setQuery}
            onCreateNew={() => setCreateOpen(true)}
            filters={filters}
            onFiltersChange={setFilters}
            listScope={listScope}
            onListScopeChange={setListScope}
            archivedCount={archivedBoletas.length}
            toolbarEnd={view === 'lista' ? toolbarSlot : undefined}
          />
        }
      >
        {view === 'lista' ? (
          <ModuleListPage
            config={boletasListConfig}
            embedded
            toolbarHost={toolbarHost}
            searchQuery={query}
            extraSeeds={listScope === 'recent' ? allBoletas : []}
            serverList={
              listScope === 'recent'
                ? undefined
                : {
                    fetchPage: (params) =>
                      fetchBoletasServerPage(params, false, serverListQuery),
                    resetKey: `${listRefreshKey}-${listScope}-${JSON.stringify(serverListQuery)}`,
                    filtersOnServer,
                  }
            }
            rowPredicate={rowPredicate}
            resolveRow={resolveListRow}
            onEditRow={canEdit ? openEditBoleta : undefined}
            onArchiveRow={canDelete ? openArchiveBoleta : undefined}
            postFilterSort={postFilterSort}
            selectionActions={listSelectionActions}
            clearSelectionKey={listRefreshKey}
          />
        ) : null}

        {view === 'segmentos' ? (
          <BoletasSegmentsView
            query={query}
            filters={filters}
            listScope={listScope}
            recentIds={recentIds}
          />
        ) : null}

        {view === 'archivados' ? (
          <BoletasArchivedView query={query} />
        ) : null}
      </ListPageLayout>

      <CreateBoletaDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
      />

      {canEdit && editingBoleta ? (
        <EditBoletaDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) setEditingBoleta(null)
          }}
          boleta={editingBoleta}
          onSave={handleEditSaved}
        />
      ) : null}

      <Dialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar boleta</DialogTitle>
            <DialogDescription>
              {archiveTarget
                ? `«${archiveTarget.number}» irá a Archivados durante ${BOLETA_ARCHIVE_RETENTION_DAYS} días.`
                : ''}
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

      <Dialog
        open={bulkArchiveIds !== null && bulkArchiveIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setBulkArchiveIds(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Archivar {bulkArchiveIds?.length ?? 0} boleta
              {bulkArchiveIds && bulkArchiveIds.length === 1 ? '' : 's'}
            </DialogTitle>
            <DialogDescription>
              Las boletas seleccionadas irán a Archivados durante {BOLETA_ARCHIVE_RETENTION_DAYS}{' '}
              días.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setBulkArchiveIds(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleBulkArchiveConfirm}>
              Archivar selección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkEditDialog
        open={bulkEditIds !== null && bulkEditIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setBulkEditIds(null)
        }}
        selectedCount={bulkEditIds?.length ?? 0}
        saving={bulkEditSaving}
        title="Editar boletas seleccionadas"
        fields={[
          {
            key: 'status',
            label: 'Estado',
            options: BOLETA_STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
          {
            key: 'paymentMethod',
            label: 'Método de pago',
            options: BOLETA_PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m, label: m })),
          },
          {
            key: 'ownerName',
            label: 'Responsable',
            placeholder: 'Nombre del responsable',
          },
        ]}
        onSubmit={handleBulkEdit}
      />
    </div>
  )
}
