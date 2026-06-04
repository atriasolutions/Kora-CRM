import { Archive } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { ListPageLayout } from '@/components/list/ListPageLayout'
import { ModuleListPage, type ListSelectionAction } from '@/components/list/ModuleListPage'
import { useEmbeddedListToolbarSlot } from '@/hooks/use-embedded-list-toolbar-slot'
import { CreatePurchaseDialog } from '@/components/purchases/CreatePurchaseDialog'
import { EditPurchaseDialog } from '@/components/purchases/EditPurchaseDialog'
import { PurchasesArchivedView } from '@/components/purchases/PurchasesArchivedView'
import { PurchasesKanbanView } from '@/components/purchases/PurchasesKanbanView'
import {
  PurchasesModuleHeader,
  type PurchasesViewId,
} from '@/components/purchases/PurchasesModuleHeader'
import { PurchasesSegmentsView } from '@/components/purchases/PurchasesSegmentsView'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { purchasesListConfig } from '@/config/list-modules/purchases'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import { resolvePurchaseListItem } from '@/data/purchase-detail.mock'
import { resolveApiListRow } from '@/lib/resolve-list-row'
import { loadPurchaseDetail } from '@/lib/entity-detail-loaders'
import type { PurchaseListItem } from '@/data/purchases.mock'
import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import { usePurchasesRegistry } from '@/hooks/use-purchases-registry'
import { fetchPurchasesServerPage } from '@/lib/module-server-list'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { PURCHASE_ARCHIVE_RETENTION_DAYS } from '@/lib/purchase-archive'
import {
  createDefaultPurchaseFilters,
  purchaseRowMatchesFilters,
  type PurchaseFilters,
} from '@/lib/purchase-filters'
import type { PurchaseFormValues } from '@/lib/purchase-form'
import {
  loadPurchaseRecentIds,
  purchaseMatchesListScope,
  sortPurchasesByRecentlyViewed,
  type PurchaseListScope,
} from '@/lib/purchase-list-scope'

export function PurchasesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { canEdit, canDelete } = useModulePermissions('compras')
  const {
    allPurchases,
    addPurchase,
    updatePurchaseFromDetail,
    archivePurchase,
    archivePurchases,
    archivedPurchases,
    isArchived,
    reloadFromApi,
  } = usePurchasesRegistry()

  const [view, setView] = useState<PurchasesViewId>('lista')
  const [listScope, setListScope] = useState<PurchaseListScope>('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<PurchaseFilters>(() =>
    createDefaultPurchaseFilters(),
  )
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()

  const recentIds = useMemo(
    () => loadPurchaseRecentIds(),
    [listRefreshKey, location.key, listScope],
  )

  const rowPredicate = useMemo(
    () => (row: PurchaseListItem) =>
      purchaseRowMatchesFilters(row, filters) &&
      !isArchived(row.id) &&
      purchaseMatchesListScope(row, listScope, recentIds),
    [filters, isArchived, listScope, recentIds],
  )

  const postFilterSort = useMemo(() => {
    if (listScope !== 'recent') return undefined
    return (rows: PurchaseListItem[]) => sortPurchasesByRecentlyViewed(rows, recentIds)
  }, [listScope, recentIds])

  useEffect(() => {
    if (location.pathname === '/compras') {
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
  const [editingPurchase, setEditingPurchase] = useState<PurchaseDetail | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<PurchaseListItem | null>(null)
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null)

  const handleCreateSubmit = useCallback(
    async (values: PurchaseFormValues) => {
      const item = await addPurchase(values)
      toast.success(`Orden «${item.reference}» creada correctamente.`)
      navigate(`/compras/${item.id}`)
    },
    [addPurchase, navigate],
  )

  const resolveListRow = useCallback(
    (row: PurchaseListItem) =>
      resolveApiListRow(row, resolvePurchaseListItem),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listRefreshKey],
  )

  const openEditPurchase = useCallback((row: PurchaseListItem) => {
    void loadPurchaseDetail(row.id)
      .then((detail) => {
        setEditingPurchase(detail)
        setEditOpen(true)
      })
      .catch(() => {
        toast.error('No se pudo cargar la orden para editar.')
      })
  }, [])

  const handleEditSaved = useCallback(
    (updated: PurchaseDetail) => {
      updatePurchaseFromDetail(updated)
      setListRefreshKey((k) => k + 1)
      toast.success(`Orden «${updated.reference}» actualizada correctamente.`)
    },
    [updatePurchaseFromDetail],
  )

  const openArchivePurchase = useCallback((row: PurchaseListItem) => {
    setArchiveTarget(row)
  }, [])

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    const reference = archiveTarget.reference
    try {
      await archivePurchase(archiveTarget.id)
      setArchiveTarget(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`Orden «${reference}» archivada.`)
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar la orden de compra.'),
      )
    }
  }, [archivePurchase, archiveTarget])

  const handleBulkArchiveConfirm = useCallback(async () => {
    if (!bulkArchiveIds?.length) return
    const count = bulkArchiveIds.length
    try {
      await archivePurchases(bulkArchiveIds)
      setBulkArchiveIds(null)
      setListRefreshKey((k) => k + 1)
      toast.success(
        `${count} orden${count === 1 ? '' : 'es'} archivada${count === 1 ? '' : 's'}.`,
      )
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudieron archivar las órdenes de compra.'),
      )
    }
  }, [archivePurchases, bulkArchiveIds])

  const listSelectionActions = useMemo<ListSelectionAction[]>(
    () =>
      canDelete
        ? [
            {
              label: 'Archivar',
              icon: Archive,
              variant: 'destructive',
              onClick: (ids) => setBulkArchiveIds(ids),
            },
          ]
        : [],
    [canDelete],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ListPageLayout
        header={
          <PurchasesModuleHeader
        view={view}
        onViewChange={setView}
        query={query}
        onQueryChange={setQuery}
        onCreateNew={() => setCreateOpen(true)}
        filters={filters}
        onFiltersChange={setFilters}
        listScope={listScope}
        onListScopeChange={setListScope}
        archivedCount={archivedPurchases.length}
        toolbarEnd={view === 'lista' ? toolbarSlot : undefined}
      />
        }
      >
            

      {view === 'lista' ? (
        <ModuleListPage
          config={purchasesListConfig}
          embedded
          toolbarHost={toolbarHost}
          searchQuery={query}
          extraSeeds={listScope === 'recent' ? allPurchases : []}
          serverList={
            listScope === 'recent'
              ? undefined
              : {
                  fetchPage: (params) => fetchPurchasesServerPage(params, false),
                  resetKey: `${listRefreshKey}-${listScope}`,
                }
          }
          rowPredicate={rowPredicate}
          resolveRow={resolveListRow}
          onEditRow={canEdit ? openEditPurchase : undefined}
          onArchiveRow={canDelete ? openArchivePurchase : undefined}
          postFilterSort={postFilterSort}
          selectionActions={listSelectionActions}
          clearSelectionKey={listRefreshKey}
        />
      ) : null}

      {view === 'kanban' ? (
        <PurchasesKanbanView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
        />
      ) : null}

      {view === 'segmentos' ? (
        <PurchasesSegmentsView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
        />
      ) : null}

      {view === 'archivados' ? (
        <PurchasesArchivedView query={query} />
      ) : null}

      </ListPageLayout>
      <CreatePurchaseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
      />

      {canEdit && editingPurchase ? (
        <EditPurchaseDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) setEditingPurchase(null)
          }}
          purchase={editingPurchase}
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
            <DialogTitle>Archivar orden de compra</DialogTitle>
            <DialogDescription>
              {archiveTarget
                ? `«${archiveTarget.reference}» irá a Archivados (papelera) durante ${PURCHASE_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma definitiva.`
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
              Archivar {bulkArchiveIds?.length ?? 0} orden
              {bulkArchiveIds && bulkArchiveIds.length === 1 ? '' : 'es'}
            </DialogTitle>
            <DialogDescription>
              Las órdenes seleccionadas irán a Archivados durante {PURCHASE_ARCHIVE_RETENTION_DAYS}{' '}
              días. Podrás restaurarlas o eliminarlas desde la papelera antes de la eliminación
              definitiva.
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
    </div>
  )
}
