import { Archive, Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { updateSolicitudApi } from '@/api/solicitudes'
import { SolicitudesArchivedView } from '@/components/solicitudes/SolicitudesArchivedView'
import { SolicitudesKanbanView } from '@/components/solicitudes/SolicitudesKanbanView'
import { SolicitudesModuleHeader } from '@/components/solicitudes/SolicitudesModuleHeader'
import { SolicitudesSegmentsView } from '@/components/solicitudes/SolicitudesSegmentsView'
import { CreateSolicitudDialog } from '@/components/solicitudes/CreateSolicitudDialog'
import { EditSolicitudDialog } from '@/components/solicitudes/EditSolicitudDialog'
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
import { solicitudesListConfig } from '@/config/list-modules/solicitudes'
import type { SolicitudDetail } from '@/data/solicitudes.mock'
import { loadSolicitudDetail } from '@/lib/entity-detail-loaders'
import type { SolicitudListItem } from '@/data/solicitudes.mock'
import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import { useSolicitudesRegistry } from '@/hooks/use-solicitudes-registry'
import { fetchSolicitudesServerPage } from '@/lib/module-server-list'
import { useAuth } from '@/hooks/use-auth'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import type { CreateSolicitudPayload } from '@/components/solicitudes/CreateSolicitudDialog'
import { SOLICITUD_ARCHIVE_RETENTION_DAYS } from '@/lib/solicitud-archive'
import {
  defaultSolicitudListScope,
  loadSolicitudRecentIds,
  normalizeSolicitudListScope,
  solicitudMatchesListScope,
  sortSolicitudesByRecentlyViewed,
  type SolicitudListScope,
} from '@/lib/solicitud-list-scope'
import {
  createDefaultSolicitudFilters,
  SOLICITUD_PRIORITY_OPTIONS,
  SOLICITUD_STATUS_OPTIONS,
  solicitudFiltersToServerQuery,
  solicitudRowMatchesFilters,
  type SolicitudFilters,
} from '@/lib/solicitud-filters'
import { getCurrentUser } from '@/lib/current-user'
import type { StandardModuleViewId } from '@/lib/module-list-views'

export function SolicitudesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const { canEdit, canDelete } = useModulePermissions('solicitudes')
  const {
    allSolicitudes,
    addSolicitud,
    updateSolicitudFromDetail,
    archiveSolicitud,
    archiveSolicitudes,
    archivedSolicitudes,
    isArchived,
    reloadFromApi,
  } = useSolicitudesRegistry()

  const [view, setView] = useState<StandardModuleViewId>('lista')
  const [listScope, setListScope] = useState<SolicitudListScope>(() =>
    defaultSolicitudListScope(profile),
  )
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SolicitudFilters>(() =>
    createDefaultSolicitudFilters(),
  )
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()

  const recentIds = useMemo(
    () => loadSolicitudRecentIds(),
    [listRefreshKey, location.key, listScope],
  )

  const serverListQuery = useMemo(
    () =>
      solicitudFiltersToServerQuery(filters, {
        mine: listScope === 'mine',
        ownerName: getCurrentUser().name,
      }),
    [filters, listScope],
  )

  const filtersOnServer = listScope !== 'recent' && isApiEnabled()

  const serverFiltersMineScope =
    isApiEnabled() && listScope === 'mine' && view === 'lista'

  const rowPredicate = useMemo(
    () => (row: SolicitudListItem) =>
      solicitudRowMatchesFilters(row, filters) &&
      !isArchived(row.id) &&
      (serverFiltersMineScope ||
        solicitudMatchesListScope(row, listScope, recentIds)),
    [filters, isArchived, listScope, recentIds, serverFiltersMineScope],
  )

  const postFilterSort = useMemo(() => {
    if (listScope !== 'recent') return undefined
    return (rows: SolicitudListItem[]) => sortSolicitudesByRecentlyViewed(rows, recentIds)
  }, [listScope, recentIds])

  useEffect(() => {
    if (location.pathname === '/solicitudes') {
      setListRefreshKey((k) => k + 1)
    }
  }, [location.pathname, location.key])

  useEffect(() => {
    setListScope((current) => normalizeSolicitudListScope(current, profile))
  }, [profile])

  const handleListScopeChange = useCallback(
    (scope: SolicitudListScope) => {
      setListScope(normalizeSolicitudListScope(scope, profile))
    },
    [profile],
  )

  useEffect(() => {
    if (!isApiEnabled()) return
    if (view !== 'lista' || listScope === 'recent') {
      void reloadFromApi().catch(() => {})
    }
  }, [view, listScope, reloadFromApi])

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingSolicitud, setEditingSolicitud] = useState<SolicitudDetail | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<SolicitudListItem | null>(null)
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null)
  const [bulkEditIds, setBulkEditIds] = useState<string[] | null>(null)
  const [bulkEditSaving, setBulkEditSaving] = useState(false)

  const handleCreateSubmit = useCallback(
    async (payload: CreateSolicitudPayload) => {
      try {
        const item = await addSolicitud(payload.values, payload.descriptionFiles)
        toast.success(`Solicitud «${item.title}» creada correctamente.`)
        navigate(`/solicitudes/${item.id}`)
      } catch {
        toast.error('No se pudo crear la solicitud.')
      }
    },
    [addSolicitud, navigate],
  )

  const resolveListRow = useCallback((row: SolicitudListItem) => row, [])

  const openEditSolicitud = useCallback(async (row: SolicitudListItem) => {
    try {
      setEditingSolicitud(await loadSolicitudDetail(row.id))
      setEditOpen(true)
    } catch {
      toast.error('No se pudo cargar la solicitud.')
    }
  }, [])

  const handleEditSaved = useCallback(
    async (updated: SolicitudDetail) => {
      try {
        await updateSolicitudFromDetail(updated)
        setListRefreshKey((k) => k + 1)
        toast.success(`Solicitud «${updated.title}» actualizada correctamente.`)
      } catch {
        toast.error('No se pudo actualizar la solicitud.')
      }
    },
    [updateSolicitudFromDetail],
  )

  const openArchiveSolicitud = useCallback((row: SolicitudListItem) => {
    setArchiveTarget(row)
  }, [])

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    const title = archiveTarget.title
    try {
      await archiveSolicitud(archiveTarget.id)
      setArchiveTarget(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`Solicitud «${title}» archivada.`)
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar la solicitud.'),
      )
    }
  }, [archiveSolicitud, archiveTarget])

  const handleBulkArchiveConfirm = useCallback(async () => {
    if (!bulkArchiveIds?.length) return
    const count = bulkArchiveIds.length
    try {
      await archiveSolicitudes(bulkArchiveIds)
      setBulkArchiveIds(null)
      setListRefreshKey((k) => k + 1)
      toast.success(
        `${count} solicitud${count === 1 ? '' : 'es'} archivada${count === 1 ? '' : 's'}.`,
      )
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudieron archivar las solicitudes.'),
      )
    }
  }, [archiveSolicitudes, bulkArchiveIds])

  const handleBulkEdit = useCallback(
    async (patch: Record<string, string>) => {
      if (!bulkEditIds?.length) return
      setBulkEditSaving(true)
      let ok = 0
      let fail = 0
      try {
        for (const id of bulkEditIds) {
          try {
            await updateSolicitudApi(id, {
              status: patch.status,
              priority: patch.priority,
              assigneeName: patch.assigneeName,
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
          toast.success(
            `${ok} solicitud${ok === 1 ? '' : 'es'} actualizada${ok === 1 ? '' : 's'}.`,
          )
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
          <SolicitudesModuleHeader
            view={view}
            onViewChange={setView}
            query={query}
            onQueryChange={setQuery}
            onCreateNew={() => setCreateOpen(true)}
            filters={filters}
            onFiltersChange={setFilters}
            listScope={listScope}
            onListScopeChange={handleListScopeChange}
            archivedCount={archivedSolicitudes.length}
            toolbarEnd={view === 'lista' ? toolbarSlot : undefined}
          />
        }
      >
        {view === 'lista' ? (
          <ModuleListPage
            config={solicitudesListConfig}
            embedded
            toolbarHost={toolbarHost}
            searchQuery={query}
            extraSeeds={listScope === 'recent' ? allSolicitudes : []}
            serverList={
              listScope === 'recent'
                ? undefined
                : {
                    fetchPage: (params) =>
                      fetchSolicitudesServerPage(params, false, serverListQuery),
                    resetKey: `${listRefreshKey}-${listScope}-${JSON.stringify(serverListQuery)}`,
                    filtersOnServer,
                  }
            }
            rowPredicate={rowPredicate}
            resolveRow={resolveListRow}
            onEditRow={canEdit ? openEditSolicitud : undefined}
            onArchiveRow={canDelete ? openArchiveSolicitud : undefined}
            postFilterSort={postFilterSort}
            selectionActions={listSelectionActions}
            clearSelectionKey={listRefreshKey}
          />
        ) : null}

        {view === 'kanban' ? (
          <SolicitudesKanbanView
            query={query}
            listScope={listScope}
            recentIds={recentIds}
            filters={filters}
          />
        ) : null}

        {view === 'segmentos' ? (
          <SolicitudesSegmentsView
            query={query}
            listScope={listScope}
            recentIds={recentIds}
            filters={filters}
          />
        ) : null}

        {view === 'archivados' ? <SolicitudesArchivedView query={query} /> : null}
      </ListPageLayout>

      <CreateSolicitudDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
      />

      {canEdit && editingSolicitud ? (
        <EditSolicitudDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) setEditingSolicitud(null)
          }}
          solicitud={editingSolicitud}
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
            <DialogTitle>Archivar solicitud</DialogTitle>
            <DialogDescription>
              {archiveTarget
                ? `«${archiveTarget.title}» irá a Archivados (papelera) durante ${SOLICITUD_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma definitiva.`
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
              Archivar {bulkArchiveIds?.length ?? 0} solicitud
              {bulkArchiveIds && bulkArchiveIds.length === 1 ? '' : 'es'}
            </DialogTitle>
            <DialogDescription>
              Las solicitudes seleccionadas irán a Archivados durante{' '}
              {SOLICITUD_ARCHIVE_RETENTION_DAYS} días. Podrás restaurarlas o eliminarlas desde la
              papelera antes de la eliminación definitiva.
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
        title="Editar solicitudes seleccionadas"
        fields={[
          {
            key: 'status',
            label: 'Estado',
            options: SOLICITUD_STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
          {
            key: 'priority',
            label: 'Prioridad',
            options: SOLICITUD_PRIORITY_OPTIONS.map((p) => ({ value: p, label: p })),
          },
          {
            key: 'assigneeName',
            label: 'Responsable',
            placeholder: 'Nombre del responsable',
          },
        ]}
        onSubmit={handleBulkEdit}
      />
    </div>
  )
}
