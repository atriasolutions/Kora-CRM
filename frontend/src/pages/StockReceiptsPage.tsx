import { Archive } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { ListPageLayout } from '@/components/list/ListPageLayout'
import { ModuleListPage, type ListSelectionAction } from '@/components/list/ModuleListPage'
import { useEmbeddedListToolbarSlot } from '@/hooks/use-embedded-list-toolbar-slot'
import { CreateStockReceiptDialog } from '@/components/stock-receipts/CreateStockReceiptDialog'
import { ImportStockReceiptsDialog } from '@/components/stock-receipts/ImportStockReceiptsDialog'
import { StockReceiptsArchivedView } from '@/components/stock-receipts/StockReceiptsArchivedView'
import { StockReceiptsKanbanView } from '@/components/stock-receipts/StockReceiptsKanbanView'
import {
  StockReceiptsModuleHeader,
  type StockReceiptsViewId,
} from '@/components/stock-receipts/StockReceiptsModuleHeader'
import { StockReceiptsSegmentsView } from '@/components/stock-receipts/StockReceiptsSegmentsView'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { stockReceiptsListConfig } from '@/config/list-modules/stock-receipts'
import { resolveStockReceiptListItem } from '@/data/stock-receipt-detail.mock'
import { resolveApiListRow } from '@/lib/resolve-list-row'
import type { StockReceiptListItem } from '@/data/stock-receipts.mock'
import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import { useStockReceiptsRegistry } from '@/hooks/use-stock-receipts-registry'
import { fetchStockReceiptsServerPage } from '@/lib/module-server-list'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { STOCK_RECEIPT_ARCHIVE_RETENTION_DAYS } from '@/lib/stock-receipt-archive'
import {
  archiveStockReceiptCopy,
  bulkArchiveStockReceiptsCopy,
} from '@/lib/stock-receipt-lifecycle-messages'
import {
  createDefaultStockReceiptFilters,
  stockReceiptRowMatchesFilters,
  type StockReceiptFilters,
} from '@/lib/stock-receipt-filters'
import type { StockReceiptFormValues } from '@/lib/stock-receipt-form'
import {
  loadStockReceiptRecentIds,
  sortStockReceiptsByRecentlyViewed,
  stockReceiptMatchesListScope,
  type StockReceiptListScope,
} from '@/lib/stock-receipt-list-scope'

export function StockReceiptsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { canDelete } = useModulePermissions('ingresos')
  const {
    allReceipts,
    addReceipt,
    archiveReceipt,
    archiveReceipts,
    archivedReceipts,
    isArchived,
    reloadFromApi,
  } = useStockReceiptsRegistry()

  const [view, setView] = useState<StockReceiptsViewId>('lista')
  const [listScope, setListScope] = useState<StockReceiptListScope>('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<StockReceiptFilters>(() =>
    createDefaultStockReceiptFilters(),
  )
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<StockReceiptListItem | null>(null)
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null)

  const recentIds = useMemo(
    () => loadStockReceiptRecentIds(),
    [listRefreshKey, location.key, listScope],
  )

  const rowPredicate = useMemo(
    () => (row: StockReceiptListItem) =>
      stockReceiptRowMatchesFilters(row, filters) &&
      !isArchived(row.id) &&
      stockReceiptMatchesListScope(row, listScope, recentIds),
    [filters, isArchived, listScope, recentIds],
  )

  const postFilterSort = useMemo(() => {
    if (listScope !== 'recent') return undefined
    return (rows: StockReceiptListItem[]) =>
      sortStockReceiptsByRecentlyViewed(rows, recentIds)
  }, [listScope, recentIds])

  useEffect(() => {
    if (location.pathname === '/ingresos') {
      setListRefreshKey((k) => k + 1)
    }
  }, [location.pathname, location.key])

  useEffect(() => {
    if (!isApiEnabled()) return
    if (view !== 'lista' || listScope === 'recent') {
      void reloadFromApi().catch(() => {})
    }
  }, [view, listScope, reloadFromApi])

  const handleCreateSubmit = useCallback(
    async (values: StockReceiptFormValues) => {
      const item = await addReceipt(values)
      toast.success(`Ingreso «${item.number}» creado. Confírmalo para sumar stock.`)
      navigate(`/ingresos/${item.id}`)
    },
    [addReceipt, navigate],
  )

  const resolveListRow = useCallback(
    (row: StockReceiptListItem) =>
      resolveApiListRow(row, resolveStockReceiptListItem),
    [listRefreshKey],
  )

  const openArchiveReceipt = useCallback((row: StockReceiptListItem) => {
    setArchiveTarget(row)
  }, [])

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    const number = archiveTarget.number
    try {
      await archiveReceipt(archiveTarget.id)
      setArchiveTarget(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`Ingreso «${number}» archivado.`)
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar el ingreso.'),
      )
    }
  }, [archiveReceipt, archiveTarget])

  const handleBulkArchiveConfirm = useCallback(async () => {
    if (!bulkArchiveIds?.length) return
    const count = bulkArchiveIds.length
    try {
      await archiveReceipts(bulkArchiveIds)
      setBulkArchiveIds(null)
      setListRefreshKey((k) => k + 1)
      toast.success(
        `${count} ingreso${count === 1 ? '' : 's'} archivado${count === 1 ? '' : 's'}.`,
      )
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudieron archivar los ingresos.'),
      )
    }
  }, [archiveReceipts, bulkArchiveIds])

  const singleArchiveCopy = useMemo(
    () =>
      archiveTarget
        ? archiveStockReceiptCopy(
            archiveTarget.status,
            archiveTarget.number,
            STOCK_RECEIPT_ARCHIVE_RETENTION_DAYS,
          )
        : null,
    [archiveTarget],
  )

  const bulkArchiveReceipts = useMemo(
    () =>
      bulkArchiveIds
        ? allReceipts.filter((r) => bulkArchiveIds.includes(r.id))
        : [],
    [allReceipts, bulkArchiveIds],
  )

  const bulkArchiveCopy = useMemo(
    () =>
      bulkArchiveReceipts.length > 0
        ? bulkArchiveStockReceiptsCopy(
            bulkArchiveReceipts,
            STOCK_RECEIPT_ARCHIVE_RETENTION_DAYS,
          )
        : null,
    [bulkArchiveReceipts],
  )

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
          <StockReceiptsModuleHeader
        view={view}
        onViewChange={setView}
        query={query}
        onQueryChange={setQuery}
        onCreateNew={() => setCreateOpen(true)}
        filters={filters}
        onFiltersChange={setFilters}
        listScope={listScope}
        onListScopeChange={setListScope}
        archivedCount={archivedReceipts.length}
        toolbarEnd={view === 'lista' ? toolbarSlot : undefined}
      />
        }
      >
            

      {view === 'lista' ? (
        <ModuleListPage
          config={stockReceiptsListConfig}
          embedded
          toolbarHost={toolbarHost}
          searchQuery={query}
          extraSeeds={listScope === 'recent' ? allReceipts : []}
          serverList={
            listScope === 'recent'
              ? undefined
              : {
                  fetchPage: (params) => fetchStockReceiptsServerPage(params, false),
                  resetKey: `${listRefreshKey}-${listScope}`,
                }
          }
          rowPredicate={rowPredicate}
          resolveRow={resolveListRow}
          onArchiveRow={canDelete ? openArchiveReceipt : undefined}
          postFilterSort={postFilterSort}
          selectionActions={listSelectionActions}
          clearSelectionKey={listRefreshKey}
        />
      ) : null}

      {view === 'kanban' ? (
        <StockReceiptsKanbanView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
        />
      ) : null}

      {view === 'segmentos' ? (
        <StockReceiptsSegmentsView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
        />
      ) : null}

      {view === 'archivados' ? (
        <StockReceiptsArchivedView query={query} />
      ) : null}

      </ListPageLayout>
      <CreateStockReceiptDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        existingNumbers={allReceipts.map((r) => r.number)}
        onSubmit={handleCreateSubmit}
      />

      <ImportStockReceiptsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        existingNumbers={allReceipts.map((r) => r.number)}
        onImport={async (values) => {
          const item = await addReceipt(values)
          toast.success(`Ingreso «${item.number}» importado. Revisa y confirma el stock.`)
          navigate(`/ingresos/${item.id}`)
        }}
      />

      <Dialog
        open={archiveTarget !== null}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{singleArchiveCopy?.title ?? 'Archivar ingreso'}</DialogTitle>
            <DialogDescription>{singleArchiveCopy?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setArchiveTarget(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleArchiveConfirm}>
              {singleArchiveCopy?.confirmLabel ?? 'Archivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkArchiveIds !== null}
        onOpenChange={(open) => !open && setBulkArchiveIds(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bulkArchiveCopy?.title ?? 'Archivar ingresos seleccionados'}</DialogTitle>
            <DialogDescription>{bulkArchiveCopy?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkArchiveIds(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleBulkArchiveConfirm}>
              {bulkArchiveCopy?.confirmLabel ?? 'Archivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
