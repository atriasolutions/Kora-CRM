import { Archive, Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { updateQuoteApi } from '@/api/quotes'
import { ListPageLayout } from '@/components/list/ListPageLayout'
import { BulkEditDialog } from '@/components/list/BulkEditDialog'
import { ModuleListPage, type ListSelectionAction } from '@/components/list/ModuleListPage'
import { useEmbeddedListToolbarSlot } from '@/hooks/use-embedded-list-toolbar-slot'
import { CreateQuoteDialog } from '@/components/quotes/CreateQuoteDialog'
import { EditQuoteDialog } from '@/components/quotes/EditQuoteDialog'
import { QuotesArchivedView } from '@/components/quotes/QuotesArchivedView'
import { QuotesKanbanView } from '@/components/quotes/QuotesKanbanView'
import {
  QuotesModuleHeader,
  type QuotesViewId,
} from '@/components/quotes/QuotesModuleHeader'
import { QuotesSegmentsView } from '@/components/quotes/QuotesSegmentsView'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { quotesListConfig } from '@/config/list-modules/quotes'
import type { QuoteDetail } from '@/data/quote-detail.mock'
import { isApiEnabled } from '@/api/config'
import { resolveQuoteListItem } from '@/data/quote-detail.mock'
import { loadQuoteDetail } from '@/lib/entity-detail-loaders'
import type { QuoteListItem } from '@/data/quotes.mock'
import { apiActionErrorMessage } from '@/api/errors'
import { useQuotesRegistry } from '@/hooks/use-quotes-registry'
import { fetchQuotesServerPage } from '@/lib/module-server-list'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { QUOTE_ARCHIVE_RETENTION_DAYS } from '@/lib/quote-archive'
import { createDefaultQuoteFormValues } from '@/lib/quote-create'
import {
  createDefaultQuoteFilters,
  QUOTE_JOURNEY_STAGE_OPTIONS,
  quoteFiltersToServerQuery,
  quoteRowMatchesFilters,
  type QuoteFilters,
} from '@/lib/quote-filters'
import { getCurrentUser } from '@/lib/current-user'
import {
  loadQuoteRecentIds,
  quoteMatchesListScope,
  sortQuotesByRecentlyViewed,
  type QuoteListScope,
} from '@/lib/quote-list-scope'

export function QuotesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { canEdit, canDelete } = useModulePermissions('cotizaciones')
  const {
    allQuotes,
    addQuote,
    updateQuoteFromDetail,
    archiveQuote,
    archiveQuotes,
    archivedQuotes,
    isArchived,
    reloadFromApi,
  } = useQuotesRegistry()

  const [view, setView] = useState<QuotesViewId>('lista')
  const [listScope, setListScope] = useState<QuoteListScope>('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<QuoteFilters>(() => createDefaultQuoteFilters())
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()

  const recentIds = useMemo(
    () => loadQuoteRecentIds(),
    [listRefreshKey, location.key, listScope],
  )

  const serverListQuery = useMemo(
    () =>
      quoteFiltersToServerQuery(filters, {
        mine: listScope === 'mine',
        ownerName: getCurrentUser().name,
      }),
    [filters, listScope],
  )

  const filtersOnServer = listScope !== 'recent' && isApiEnabled()

  const rowPredicate = useMemo(
    () => (row: QuoteListItem) =>
      quoteRowMatchesFilters(row, filters) &&
      !isArchived(row.id) &&
      quoteMatchesListScope(row, listScope, recentIds),
    [filters, isArchived, listScope, recentIds],
  )

  const postFilterSort = useMemo(() => {
    if (listScope !== 'recent') return undefined
    return (rows: QuoteListItem[]) => sortQuotesByRecentlyViewed(rows, recentIds)
  }, [listScope, recentIds])

  useEffect(() => {
    if (location.pathname === '/cotizaciones') {
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
  const [editingQuote, setEditingQuote] = useState<QuoteDetail | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<QuoteListItem | null>(null)
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null)
  const [bulkEditIds, setBulkEditIds] = useState<string[] | null>(null)
  const [bulkEditSaving, setBulkEditSaving] = useState(false)

  const handleCreateSubmit = useCallback(
    async (values: Parameters<typeof addQuote>[0]) => {
      const item = await addQuote(values)
      toast.success(`Cotización «${item.code}» creada correctamente.`)
      navigate(`/cotizaciones/${item.id}`)
    },
    [addQuote, navigate],
  )

  const resolveListRow = useCallback(
    (row: QuoteListItem) => (isApiEnabled() ? row : resolveQuoteListItem(row.id)),
    [listRefreshKey],
  )

  const openEditQuote = useCallback((row: QuoteListItem) => {
    loadQuoteDetail(row.id).then(setEditingQuote)
    setEditOpen(true)
  }, [])

  const handleEditSaved = useCallback(
    async (updated: QuoteDetail) => {
      try {
        const persisted = await updateQuoteFromDetail(updated)
        setListRefreshKey((k) => k + 1)
        toast.success(`Cotización «${persisted.code}» actualizada correctamente.`)
      } catch (error) {
        toast.error(
          apiActionErrorMessage(error, 'No se pudo guardar la cotización.'),
        )
      }
    },
    [updateQuoteFromDetail],
  )

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    const code = archiveTarget.code
    try {
      await archiveQuote(archiveTarget.id)
      setArchiveTarget(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`Cotización «${code}» archivada.`)
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar la cotización.'),
      )
    }
  }, [archiveQuote, archiveTarget])

  const handleBulkArchiveConfirm = useCallback(async () => {
    if (!bulkArchiveIds?.length) return
    const count = bulkArchiveIds.length
    try {
      await archiveQuotes(bulkArchiveIds)
      setBulkArchiveIds(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`${count} cotización${count === 1 ? '' : 'es'} archivada${count === 1 ? '' : 's'}.`)
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudieron archivar las cotizaciones seleccionadas.'),
      )
    }
  }, [archiveQuotes, bulkArchiveIds])

  const handleBulkEdit = useCallback(
    async (patch: Record<string, string>) => {
      if (!bulkEditIds?.length) return
      setBulkEditSaving(true)
      let ok = 0
      let fail = 0
      try {
        for (const id of bulkEditIds) {
          try {
            await updateQuoteApi(id, {
              status: patch.status,
              owner: patch.ownerName,
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
            `${ok} cotización${ok === 1 ? '' : 'es'} actualizada${ok === 1 ? '' : 's'}.`,
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
          <QuotesModuleHeader
            view={view}
            onViewChange={setView}
            query={query}
            onQueryChange={setQuery}
            onCreateNew={() => setCreateOpen(true)}
            filters={filters}
            onFiltersChange={setFilters}
            listScope={listScope}
            onListScopeChange={setListScope}
            archivedCount={archivedQuotes.length}
            toolbarEnd={view === 'lista' ? toolbarSlot : undefined}
          />
        }
      >
        {view === 'lista' ? (
          <ModuleListPage
            config={quotesListConfig}
            embedded
            toolbarHost={toolbarHost}
            searchQuery={query}
            extraSeeds={listScope === 'recent' ? allQuotes : []}
            serverList={
              listScope === 'recent'
                ? undefined
                : {
                    fetchPage: (params) =>
                      fetchQuotesServerPage(params, false, serverListQuery),
                    resetKey: `${listRefreshKey}-${listScope}-${JSON.stringify(serverListQuery)}`,
                    filtersOnServer,
                  }
            }
            rowPredicate={rowPredicate}
            resolveRow={resolveListRow}
            onEditRow={canEdit ? openEditQuote : undefined}
            onArchiveRow={canDelete ? setArchiveTarget : undefined}
            postFilterSort={postFilterSort}
            selectionActions={listSelectionActions}
            clearSelectionKey={listRefreshKey}
          />
        ) : null}

        {view === 'kanban' ? (
          <QuotesKanbanView
            query={query}
            filters={filters}
            listScope={listScope}
            recentIds={recentIds}
          />
        ) : null}

        {view === 'segmentos' ? (
          <QuotesSegmentsView
            query={query}
            filters={filters}
            listScope={listScope}
            recentIds={recentIds}
          />
        ) : null}

        {view === 'archivados' ? (
          <QuotesArchivedView query={query} />
        ) : null}
      </ListPageLayout>

      <CreateQuoteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialValues={createDefaultQuoteFormValues()}
        onSubmit={handleCreateSubmit}
      />

      {canEdit && editingQuote ? (
        <EditQuoteDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          quote={editingQuote}
          onSave={handleEditSaved}
        />
      ) : null}

      <Dialog open={archiveTarget !== null} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar cotización</DialogTitle>
            <DialogDescription>
              «{archiveTarget?.code}» irá a Archivados durante {QUOTE_ARCHIVE_RETENTION_DAYS} días.
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

      <Dialog open={bulkArchiveIds !== null} onOpenChange={(o) => !o && setBulkArchiveIds(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar cotizaciones</DialogTitle>
            <DialogDescription>
              Se archivarán {bulkArchiveIds?.length} cotización
              {bulkArchiveIds?.length === 1 ? '' : 'es'}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setBulkArchiveIds(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleBulkArchiveConfirm}>
              Archivar
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
        title="Editar cotizaciones seleccionadas"
        fields={[
          {
            key: 'status',
            label: 'Estado',
            options: QUOTE_JOURNEY_STAGE_OPTIONS.map((s) => ({ value: s, label: s })),
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
