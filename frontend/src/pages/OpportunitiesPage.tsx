import { Archive, Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { updateOpportunityApi } from '@/api/opportunities'
import { ListPageLayout } from '@/components/list/ListPageLayout'
import { BulkEditDialog } from '@/components/list/BulkEditDialog'
import { ModuleListPage, type ListSelectionAction } from '@/components/list/ModuleListPage'
import { useEmbeddedListToolbarSlot } from '@/hooks/use-embedded-list-toolbar-slot'
import { CreateOpportunityDialog } from '@/components/opportunities/CreateOpportunityDialog'
import { DuplicateOpportunityDialog } from '@/components/opportunities/DuplicateOpportunityDialog'
import { EditOpportunityDialog } from '@/components/opportunities/EditOpportunityDialog'
import { OpportunitiesArchivedView } from '@/components/opportunities/OpportunitiesArchivedView'
import { OpportunitiesKanbanView } from '@/components/opportunities/OpportunitiesKanbanView'
import {
  OpportunitiesModuleHeader,
  type OpportunitiesViewId,
} from '@/components/opportunities/OpportunitiesModuleHeader'
import { OpportunitiesSegmentsView } from '@/components/opportunities/OpportunitiesSegmentsView'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { opportunitiesListConfig } from '@/config/list-modules/opportunities'
import type { OpportunityDetail } from '@/data/opportunity-detail.mock'
import { resolveOpportunityListItem } from '@/data/opportunity-detail.mock'
import { resolveApiListRow } from '@/lib/resolve-list-row'
import { loadOpportunityDetail } from '@/lib/entity-detail-loaders'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import { useOpportunitiesRegistry } from '@/hooks/use-opportunities-registry'
import { fetchOpportunitiesServerPage } from '@/lib/module-server-list'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import {
  duplicateOpportunityFormValues,
  type CreateOpportunityFormValues,
} from '@/lib/opportunity-create'
import {
  createDefaultOpportunityFilters,
  OPPORTUNITY_OUTCOME_OPTIONS,
  OPPORTUNITY_PRIORITY_FILTER_OPTIONS,
  OPPORTUNITY_STAGE_OPTIONS,
  opportunityFiltersToServerQuery,
  opportunityRowMatchesFilters,
  type OpportunityFilters,
} from '@/lib/opportunity-filters'
import { OPPORTUNITY_ARCHIVE_RETENTION_DAYS } from '@/lib/opportunity-archive'
import { getCurrentUser } from '@/lib/current-user'
import {
  loadOpportunityRecentIds,
  opportunityMatchesListScope,
  sortOpportunitiesByRecentlyViewed,
  type OpportunityListScope,
} from '@/lib/opportunity-list-scope'

export function OpportunitiesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { canEdit, canDelete } = useModulePermissions('oportunidades')
  const {
    allOpportunities,
    addOpportunity,
    updateOpportunityFromDetail,
    archiveOpportunity,
    archiveOpportunities,
    archivedOpportunities,
    isArchived,
    reloadFromApi,
  } = useOpportunitiesRegistry()

  const [view, setView] = useState<OpportunitiesViewId>('lista')
  const [listScope, setListScope] = useState<OpportunityListScope>('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<OpportunityFilters>(() =>
    createDefaultOpportunityFilters(),
  )
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()

  const recentIds = useMemo(
    () => loadOpportunityRecentIds(),
    [listRefreshKey, location.key, listScope],
  )

  const serverListQuery = useMemo(
    () =>
      opportunityFiltersToServerQuery(filters, {
        mine: listScope === 'mine',
        ownerName: getCurrentUser().name,
      }),
    [filters, listScope],
  )

  const filtersOnServer = listScope !== 'recent' && isApiEnabled()

  const rowPredicate = useMemo(
    () => (row: OpportunityListItem) =>
      opportunityRowMatchesFilters(row, filters) &&
      !isArchived(row.id) &&
      opportunityMatchesListScope(row, listScope, recentIds),
    [filters, isArchived, listScope, recentIds],
  )

  const postFilterSort = useMemo(() => {
    if (listScope !== 'recent') return undefined
    return (rows: OpportunityListItem[]) =>
      sortOpportunitiesByRecentlyViewed(rows, recentIds)
  }, [listScope, recentIds])

  useEffect(() => {
    if (location.pathname === '/oportunidades') {
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
  const [createInitial, setCreateInitial] = useState<Partial<CreateOpportunityFormValues>>()
  const [createTitle, setCreateTitle] = useState('Nueva oportunidad')
  const [editOpen, setEditOpen] = useState(false)
  const [editingOpportunity, setEditingOpportunity] = useState<OpportunityDetail | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<OpportunityListItem | null>(null)
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null)
  const [bulkEditIds, setBulkEditIds] = useState<string[] | null>(null)
  const [bulkEditSaving, setBulkEditSaving] = useState(false)

  const handleCreateSubmit = useCallback(
    async (values: CreateOpportunityFormValues) => {
      const item = await addOpportunity(values)
      toast.success(`Oportunidad «${item.name}» creada correctamente.`)
      navigate(`/oportunidades/${item.id}`)
    },
    [addOpportunity, navigate],
  )

  const handleDuplicateSelect = useCallback((source: OpportunityListItem) => {
    setCreateInitial(duplicateOpportunityFormValues(source))
    setCreateTitle('Duplicar oportunidad')
    setCreateOpen(true)
  }, [])

  const resolveListRow = useCallback(
    (row: OpportunityListItem) =>
      resolveApiListRow(row, resolveOpportunityListItem),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listRefreshKey],
  )

  const openEditOpportunity = useCallback((row: OpportunityListItem) => {
    loadOpportunityDetail(row.id).then(setEditingOpportunity)
    setEditOpen(true)
  }, [])

  const handleEditSaved = useCallback(
    (updated: OpportunityDetail) => {
      updateOpportunityFromDetail(updated)
      setListRefreshKey((k) => k + 1)
      toast.success(`Oportunidad «${updated.name}» actualizada correctamente.`)
    },
    [updateOpportunityFromDetail],
  )

  const openArchiveOpportunity = useCallback((row: OpportunityListItem) => {
    setArchiveTarget(row)
  }, [])

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    const name = archiveTarget.name
    try {
      await archiveOpportunity(archiveTarget.id)
      setArchiveTarget(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`Oportunidad «${name}» archivada.`)
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar la oportunidad.'),
      )
    }
  }, [archiveOpportunity, archiveTarget])

  const handleBulkArchiveConfirm = useCallback(async () => {
    if (!bulkArchiveIds?.length) return
    const count = bulkArchiveIds.length
    try {
      await archiveOpportunities(bulkArchiveIds)
      setBulkArchiveIds(null)
      setListRefreshKey((k) => k + 1)
      toast.success(
        `${count} oportunidad${count === 1 ? '' : 'es'} archivada${count === 1 ? '' : 's'}.`,
      )
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudieron archivar las oportunidades.'),
      )
    }
  }, [archiveOpportunities, bulkArchiveIds])

  const handleBulkEdit = useCallback(
    async (patch: Record<string, string>) => {
      if (!bulkEditIds?.length) return
      setBulkEditSaving(true)
      let ok = 0
      let fail = 0
      try {
        for (const id of bulkEditIds) {
          try {
            await updateOpportunityApi(id, {
              stage: patch.stage,
              owner: patch.ownerName,
              priority: patch.priority,
              outcome: patch.outcome,
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
            `${ok} oportunidad${ok === 1 ? '' : 'es'} actualizada${ok === 1 ? '' : 's'}.`,
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
          <OpportunitiesModuleHeader
        view={view}
        onViewChange={setView}
        query={query}
        onQueryChange={setQuery}
        onCreateNew={() => {
          setCreateInitial(undefined)
          setCreateTitle('Nueva oportunidad')
          setCreateOpen(true)
        }}
        onDuplicate={() => setDuplicateOpen(true)}
        filters={filters}
        onFiltersChange={setFilters}
        listScope={listScope}
        onListScopeChange={setListScope}
        archivedCount={archivedOpportunities.length}
        toolbarEnd={view === 'lista' ? toolbarSlot : undefined}
      />
        }
      >
            

      {view === 'lista' ? (
        <ModuleListPage
          config={opportunitiesListConfig}
          embedded
          toolbarHost={toolbarHost}
          searchQuery={query}
          extraSeeds={listScope === 'recent' ? allOpportunities : []}
          serverList={
            listScope === 'recent'
              ? undefined
              : {
                  fetchPage: (params) =>
                    fetchOpportunitiesServerPage(params, false, serverListQuery),
                  resetKey: `${listRefreshKey}-${listScope}-${JSON.stringify(serverListQuery)}`,
                  filtersOnServer,
                }
          }
          rowPredicate={rowPredicate}
          resolveRow={resolveListRow}
          onEditRow={canEdit ? openEditOpportunity : undefined}
          onArchiveRow={canDelete ? openArchiveOpportunity : undefined}
          postFilterSort={postFilterSort}
          selectionActions={listSelectionActions}
          clearSelectionKey={listRefreshKey}
        />
      ) : null}

      {view === 'kanban' ? (
        <OpportunitiesKanbanView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
        />
      ) : null}

      {view === 'segmentos' ? (
        <OpportunitiesSegmentsView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
        />
      ) : null}

      {view === 'archivados' ? (
        <OpportunitiesArchivedView query={query} />
      ) : null}

      </ListPageLayout>
      <CreateOpportunityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={createTitle}
        description={
          createTitle === 'Duplicar oportunidad'
            ? 'Revisa los datos copiados y guarda el nuevo registro.'
            : undefined
        }
        initialValues={createInitial}
        onSubmit={handleCreateSubmit}
      />

      <DuplicateOpportunityDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        opportunities={allOpportunities}
        onSelectDuplicate={handleDuplicateSelect}
      />

      {canEdit && editingOpportunity ? (
        <EditOpportunityDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) setEditingOpportunity(null)
          }}
          opportunity={editingOpportunity}
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
            <DialogTitle>Archivar oportunidad</DialogTitle>
            <DialogDescription>
              {archiveTarget
                ? `«${archiveTarget.name}» irá a Archivados (papelera) durante ${OPPORTUNITY_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma definitiva.`
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
              Archivar {bulkArchiveIds?.length ?? 0} oportunidad
              {bulkArchiveIds && bulkArchiveIds.length === 1 ? '' : 'es'}
            </DialogTitle>
            <DialogDescription>
              Las oportunidades seleccionadas irán a Archivados durante{' '}
              {OPPORTUNITY_ARCHIVE_RETENTION_DAYS} días. Podrás restaurarlas o eliminarlas desde la
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
        title="Editar oportunidades seleccionadas"
        fields={[
          {
            key: 'stage',
            label: 'Etapa',
            options: OPPORTUNITY_STAGE_OPTIONS.map((s) => ({ value: s, label: s })),
          },
          {
            key: 'outcome',
            label: 'Resultado',
            options: OPPORTUNITY_OUTCOME_OPTIONS.map((o) => ({ value: o, label: o })),
          },
          {
            key: 'priority',
            label: 'Prioridad',
            options: OPPORTUNITY_PRIORITY_FILTER_OPTIONS.map((p) => ({
              value: p,
              label: p,
            })),
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
