import { Archive, Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { updateActivityApi } from '@/api/activities'
import { ActivitiesArchivedView } from '@/components/activities/ActivitiesArchivedView'
import { ActivitiesKanbanView } from '@/components/activities/ActivitiesKanbanView'
import {
  ActivitiesModuleHeader,
  type ActivitiesViewId,
} from '@/components/activities/ActivitiesModuleHeader'
import { ActivitiesSegmentsView } from '@/components/activities/ActivitiesSegmentsView'
import { CreateActivityDialog } from '@/components/activities/CreateActivityDialog'
import { DuplicateActivityDialog } from '@/components/activities/DuplicateActivityDialog'
import { EditActivityDialog } from '@/components/activities/EditActivityDialog'
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
import { activitiesListConfig } from '@/config/list-modules/activities'
import type { ActivityDetail } from '@/data/activity-detail.mock'
import { resolveActivityListItem } from '@/data/activity-detail.mock'
import { resolveApiListRow } from '@/lib/resolve-list-row'
import { loadActivityDetail } from '@/lib/entity-detail-loaders'
import type { ActivityListItem } from '@/data/activities.mock'
import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import { useActivitiesRegistry } from '@/hooks/use-activities-registry'
import { fetchActivitiesServerPage } from '@/lib/module-server-list'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import {
  duplicateActivityFormValues,
  type CreateActivityFormValues,
} from '@/lib/activity-create'
import {
  activityFiltersToServerQuery,
  activityHasClientOnlyFilters,
  activityRowMatchesFilters,
  ACTIVITY_PRIORITY_FILTER_OPTIONS,
  ACTIVITY_STATUS_OPTIONS,
  createDefaultActivityFilters,
  type ActivityFilters,
} from '@/lib/activity-filters'
import { ACTIVITY_ARCHIVE_RETENTION_DAYS } from '@/lib/activity-archive'
import { getCurrentUser } from '@/lib/current-user'
import {
  activityMatchesListScope,
  loadActivityRecentIds,
  sortActivitiesByRecentlyViewed,
  type ActivityListScope,
} from '@/lib/activity-list-scope'

export function ActivitiesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { canEdit, canDelete } = useModulePermissions('actividades')
  const {
    allActivities,
    addActivity,
    updateActivityFromDetail,
    archiveActivity,
    archiveActivities,
    archivedActivities,
    isArchived,
    reloadFromApi,
  } = useActivitiesRegistry()

  const [view, setView] = useState<ActivitiesViewId>('lista')
  const [listScope, setListScope] = useState<ActivityListScope>('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ActivityFilters>(() =>
    createDefaultActivityFilters(),
  )
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()

  const recentIds = useMemo(
    () => loadActivityRecentIds(),
    [listRefreshKey, location.key, listScope],
  )

  const serverListQuery = useMemo(
    () =>
      activityFiltersToServerQuery(filters, {
        mine: listScope === 'mine',
        ownerName: getCurrentUser().name,
      }),
    [filters, listScope],
  )

  const filtersOnServer =
    listScope !== 'recent' &&
    isApiEnabled() &&
    !activityHasClientOnlyFilters(filters)

  const rowPredicate = useMemo(
    () => (row: ActivityListItem) =>
      activityRowMatchesFilters(row, filters) &&
      !isArchived(row.id) &&
      activityMatchesListScope(row, listScope, recentIds),
    [filters, isArchived, listScope, recentIds],
  )

  const postFilterSort = useMemo(() => {
    if (listScope !== 'recent') return undefined
    return (rows: ActivityListItem[]) => sortActivitiesByRecentlyViewed(rows, recentIds)
  }, [listScope, recentIds])

  useEffect(() => {
    if (location.pathname === '/actividades') {
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
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [createInitial, setCreateInitial] = useState<Partial<CreateActivityFormValues>>()
  const [createTitle, setCreateTitle] = useState('Nueva actividad')
  const [editOpen, setEditOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<ActivityDetail | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ActivityListItem | null>(null)
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null)
  const [bulkEditIds, setBulkEditIds] = useState<string[] | null>(null)
  const [bulkEditSaving, setBulkEditSaving] = useState(false)

  const handleCreateSubmit = useCallback(
    async (values: CreateActivityFormValues) => {
      try {
        const item = await addActivity(values)
        toast.success(`Actividad «${item.title}» creada correctamente.`)
        navigate(`/actividades/${item.id}`)
      } catch {
        toast.error('No se pudo crear la actividad.')
      }
    },
    [addActivity, navigate],
  )

  const handleDuplicateSelect = useCallback((source: ActivityListItem) => {
    setCreateInitial(duplicateActivityFormValues(source))
    setCreateTitle('Duplicar actividad')
    setCreateOpen(true)
  }, [])

  const resolveListRow = useCallback(
    (row: ActivityListItem) =>
      resolveApiListRow(row, resolveActivityListItem),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listRefreshKey],
  )

  const openEditActivity = useCallback(async (row: ActivityListItem) => {
    try {
      setEditingActivity(await loadActivityDetail(row.id))
      setEditOpen(true)
    } catch {
      toast.error('No se pudo cargar la actividad.')
    }
  }, [])

  const handleEditSaved = useCallback(
    async (updated: ActivityDetail) => {
      try {
        await updateActivityFromDetail(updated)
        setListRefreshKey((k) => k + 1)
        toast.success(`Actividad «${updated.title}» actualizada correctamente.`)
      } catch {
        toast.error('No se pudo actualizar la actividad.')
      }
    },
    [updateActivityFromDetail],
  )

  const openArchiveActivity = useCallback((row: ActivityListItem) => {
    setArchiveTarget(row)
  }, [])

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    const title = archiveTarget.title
    try {
      await archiveActivity(archiveTarget.id)
      setArchiveTarget(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`Actividad «${title}» archivada.`)
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar la actividad.'),
      )
    }
  }, [archiveActivity, archiveTarget])

  const handleBulkArchiveConfirm = useCallback(async () => {
    if (!bulkArchiveIds?.length) return
    const count = bulkArchiveIds.length
    try {
      await archiveActivities(bulkArchiveIds)
      setBulkArchiveIds(null)
      setListRefreshKey((k) => k + 1)
      toast.success(
        `${count} actividad${count === 1 ? '' : 'es'} archivada${count === 1 ? '' : 's'}.`,
      )
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudieron archivar las actividades.'),
      )
    }
  }, [archiveActivities, bulkArchiveIds])

  const handleBulkEdit = useCallback(
    async (patch: Record<string, string>) => {
      if (!bulkEditIds?.length) return
      setBulkEditSaving(true)
      let ok = 0
      let fail = 0
      try {
        for (const id of bulkEditIds) {
          try {
            await updateActivityApi(id, {
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
            `${ok} actividad${ok === 1 ? '' : 'es'} actualizada${ok === 1 ? '' : 's'}.`,
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
          <ActivitiesModuleHeader
        view={view}
        onViewChange={setView}
        query={query}
        onQueryChange={setQuery}
        onCreateNew={() => {
          setCreateInitial(undefined)
          setCreateTitle('Nueva actividad')
          setCreateOpen(true)
        }}
        onDuplicate={() => setDuplicateOpen(true)}
        filters={filters}
        onFiltersChange={setFilters}
        listScope={listScope}
        onListScopeChange={setListScope}
        archivedCount={archivedActivities.length}
        toolbarEnd={view === 'lista' ? toolbarSlot : undefined}
      />
        }
      >
            

      {view === 'lista' ? (
        <ModuleListPage
          config={activitiesListConfig}
          embedded
          toolbarHost={toolbarHost}
          searchQuery={query}
          extraSeeds={listScope === 'recent' ? allActivities : []}
          serverList={
            listScope === 'recent'
              ? undefined
              : {
                  fetchPage: (params) =>
                    fetchActivitiesServerPage(params, false, serverListQuery),
                  resetKey: `${listRefreshKey}-${listScope}-${JSON.stringify(serverListQuery)}`,
                  filtersOnServer,
                }
          }
          rowPredicate={rowPredicate}
          resolveRow={resolveListRow}
          onEditRow={canEdit ? openEditActivity : undefined}
          onArchiveRow={canDelete ? openArchiveActivity : undefined}
          postFilterSort={postFilterSort}
          selectionActions={listSelectionActions}
          clearSelectionKey={listRefreshKey}
        />
      ) : null}

      {view === 'kanban' ? (
        <ActivitiesKanbanView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
        />
      ) : null}

      {view === 'segmentos' ? (
        <ActivitiesSegmentsView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
        />
      ) : null}

      {view === 'archivados' ? (
        <ActivitiesArchivedView query={query} />
      ) : null}

      </ListPageLayout>
      <CreateActivityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={createTitle}
        description={
          createTitle === 'Duplicar actividad'
            ? 'Revisa los datos copiados y guarda el nuevo registro.'
            : undefined
        }
        initialValues={createInitial}
        onSubmit={handleCreateSubmit}
      />

      <DuplicateActivityDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        activities={allActivities}
        onSelectDuplicate={handleDuplicateSelect}
      />

      {canEdit && editingActivity ? (
        <EditActivityDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) setEditingActivity(null)
          }}
          activity={editingActivity}
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
            <DialogTitle>Archivar actividad</DialogTitle>
            <DialogDescription>
              {archiveTarget
                ? `«${archiveTarget.title}» irá a Archivados (papelera) durante ${ACTIVITY_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma definitiva.`
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
              Archivar {bulkArchiveIds?.length ?? 0} actividad
              {bulkArchiveIds && bulkArchiveIds.length === 1 ? '' : 'es'}
            </DialogTitle>
            <DialogDescription>
              Las actividades seleccionadas irán a Archivados durante{' '}
              {ACTIVITY_ARCHIVE_RETENTION_DAYS} días. Podrás restaurarlas o eliminarlas desde la
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
        title="Editar actividades seleccionadas"
        fields={[
          {
            key: 'status',
            label: 'Estado',
            options: ACTIVITY_STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
          {
            key: 'priority',
            label: 'Prioridad',
            options: ACTIVITY_PRIORITY_FILTER_OPTIONS.map((p) => ({ value: p, label: p })),
          },
          {
            key: 'assigneeName',
            label: 'Asignado',
            placeholder: 'Nombre del asignado',
          },
        ]}
        onSubmit={handleBulkEdit}
      />
    </div>
  )
}
