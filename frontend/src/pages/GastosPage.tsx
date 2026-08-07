import { Archive, Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { updateExpenseApi } from '@/api/expenses'
import { GastosArchivedView } from '@/components/gastos/GastosArchivedView'
import { GastosModuleHeader } from '@/components/gastos/GastosModuleHeader'
import { GastosSegmentsView } from '@/components/gastos/GastosSegmentsView'
import { CreateExpenseDialog } from '@/components/gastos/CreateExpenseDialog'
import { EditExpenseDialog } from '@/components/gastos/EditExpenseDialog'
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
import { gastosListConfig } from '@/config/list-modules/gastos'
import { isApiEnabled } from '@/api/config'
import { loadExpenseDetail } from '@/lib/entity-detail-loaders'
import {
  resolveExpenseListItem,
  type ExpenseDetail,
  type ExpenseListItem,
} from '@/data/expenses.mock'
import {
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_PAYMENT_METHOD_OPTIONS,
  EXPENSE_STATUS_OPTIONS,
} from '@/lib/expense-filters'
import { apiActionErrorMessage } from '@/api/errors'
import { useExpensesRegistry } from '@/hooks/use-expenses-registry'
import { fetchExpensesServerPage } from '@/lib/module-server-list'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import type { CreateExpenseFormValues } from '@/lib/expense-create'
import {
  createDefaultExpenseFilters,
  expenseFiltersToServerQuery,
  expenseRowMatchesFilters,
  type ExpenseFilters,
} from '@/lib/expense-filters'
import { EXPENSE_ARCHIVE_RETENTION_DAYS } from '@/lib/expense-archive'
import {
  expenseMatchesListScope,
  loadExpenseRecentIds,
  sortExpensesByRecentlyViewed,
  type ExpenseListScope,
} from '@/lib/expense-list-scope'
import { getCurrentUser } from '@/lib/current-user'
import type { GastosModuleViewId } from '@/lib/module-list-views'

export function GastosPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { canEdit, canDelete } = useModulePermissions('gastos')
  const {
    allExpenses,
    addExpense,
    updateExpenseFromDetail,
    archiveExpense,
    archiveExpenses,
    archivedExpenses,
    isArchived,
    reloadFromApi,
  } = useExpensesRegistry()

  const [view, setView] = useState<GastosModuleViewId>('lista')
  const [listScope, setListScope] = useState<ExpenseListScope>('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ExpenseFilters>(() => createDefaultExpenseFilters())
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()

  const recentIds = useMemo(
    () => loadExpenseRecentIds(),
    [listRefreshKey, location.key, listScope],
  )

  const serverListQuery = useMemo(
    () =>
      expenseFiltersToServerQuery(filters, {
        mine: listScope === 'mine',
        ownerName: getCurrentUser().name,
      }),
    [filters, listScope],
  )

  const filtersOnServer = listScope !== 'recent' && isApiEnabled()

  const rowPredicate = useMemo(
    () => (row: ExpenseListItem) =>
      expenseRowMatchesFilters(row, filters) &&
      !isArchived(row.id) &&
      expenseMatchesListScope(row, listScope, recentIds),
    [filters, isArchived, listScope, recentIds],
  )

  const postFilterSort = useMemo(() => {
    if (listScope !== 'recent') return undefined
    return (rows: ExpenseListItem[]) => sortExpensesByRecentlyViewed(rows, recentIds)
  }, [listScope, recentIds])

  useEffect(() => {
    if (location.pathname === '/gastos') {
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
  const [editingExpense, setEditingExpense] = useState<ExpenseDetail | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ExpenseListItem | null>(null)
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null)
  const [bulkEditIds, setBulkEditIds] = useState<string[] | null>(null)
  const [bulkEditSaving, setBulkEditSaving] = useState(false)

  const handleCreateSubmit = useCallback(
    async (values: CreateExpenseFormValues) => {
      try {
        const item = await addExpense(values)
        toast.success(`Gasto «${item.number}» creado correctamente.`)
        navigate(`/gastos/${item.id}`)
      } catch (error) {
        toast.error(apiActionErrorMessage(error, 'No se pudo crear el gasto.'))
      }
    },
    [addExpense, navigate],
  )

  const resolveListRow = useCallback(
    (row: ExpenseListItem) => (isApiEnabled() ? row : resolveExpenseListItem(row.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listRefreshKey],
  )

  const openEditExpense = useCallback(async (row: ExpenseListItem) => {
    try {
      setEditingExpense(await loadExpenseDetail(row.id))
      setEditOpen(true)
    } catch {
      toast.error('No se pudo cargar el gasto.')
    }
  }, [])

  const handleEditSaved = useCallback(
    async (updated: ExpenseDetail) => {
      try {
        await updateExpenseFromDetail(updated)
        setListRefreshKey((k) => k + 1)
        toast.success(`Gasto «${updated.number}» actualizado correctamente.`)
      } catch {
        toast.error('No se pudo actualizar el gasto.')
      }
    },
    [updateExpenseFromDetail],
  )

  const openArchiveExpense = useCallback((row: ExpenseListItem) => {
    setArchiveTarget(row)
  }, [])

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    const number = archiveTarget.number
    try {
      await archiveExpense(archiveTarget.id)
      setArchiveTarget(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`Gasto «${number}» archivado.`)
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo archivar el gasto.'))
    }
  }, [archiveExpense, archiveTarget])

  const handleBulkArchiveConfirm = useCallback(async () => {
    if (!bulkArchiveIds?.length) return
    const count = bulkArchiveIds.length
    try {
      await archiveExpenses(bulkArchiveIds)
      setBulkArchiveIds(null)
      setListRefreshKey((k) => k + 1)
      toast.success(
        `${count} gasto${count === 1 ? '' : 's'} archivado${count === 1 ? '' : 's'}.`,
      )
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudieron archivar los gastos.'))
    }
  }, [archiveExpenses, bulkArchiveIds])

  const handleBulkEdit = useCallback(
    async (patch: Record<string, string>) => {
      if (!bulkEditIds?.length) return
      setBulkEditSaving(true)
      let ok = 0
      let fail = 0
      try {
        for (const id of bulkEditIds) {
          try {
            await updateExpenseApi(id, {
              status: patch.status,
              category: patch.category,
              paymentMethod: patch.paymentMethod,
              ownerName: patch.ownerName,
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
          toast.success(`${ok} gasto${ok === 1 ? '' : 's'} actualizado${ok === 1 ? '' : 's'}.`)
        } else {
          toast.warning(`${ok} actualizados, ${fail} con error.`)
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
          <GastosModuleHeader
            view={view}
            onViewChange={setView}
            query={query}
            onQueryChange={setQuery}
            onCreateNew={() => setCreateOpen(true)}
            filters={filters}
            onFiltersChange={setFilters}
            listScope={listScope}
            onListScopeChange={setListScope}
            archivedCount={archivedExpenses.length}
            toolbarEnd={view === 'lista' ? toolbarSlot : undefined}
          />
        }
      >
        {view === 'lista' ? (
          <ModuleListPage
            config={gastosListConfig}
            embedded
            toolbarHost={toolbarHost}
            searchQuery={query}
            extraSeeds={listScope === 'recent' ? allExpenses : []}
            serverList={
              listScope === 'recent'
                ? undefined
                : {
                    fetchPage: (params) =>
                      fetchExpensesServerPage(params, false, serverListQuery),
                    resetKey: `${listRefreshKey}-${listScope}-${JSON.stringify(serverListQuery)}`,
                    filtersOnServer,
                  }
            }
            rowPredicate={rowPredicate}
            resolveRow={resolveListRow}
            onEditRow={canEdit ? openEditExpense : undefined}
            onArchiveRow={canDelete ? openArchiveExpense : undefined}
            postFilterSort={postFilterSort}
            selectionActions={listSelectionActions}
            clearSelectionKey={listRefreshKey}
          />
        ) : null}

        {view === 'segmentos' ? (
          <GastosSegmentsView
            query={query}
            filters={filters}
            listScope={listScope}
            recentIds={recentIds}
          />
        ) : null}

        {view === 'archivados' ? <GastosArchivedView query={query} /> : null}
      </ListPageLayout>

      <CreateExpenseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateSubmit}
      />

      {canEdit && editingExpense ? (
        <EditExpenseDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) setEditingExpense(null)
          }}
          expense={editingExpense}
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
            <DialogTitle>Archivar gasto</DialogTitle>
            <DialogDescription>
              {archiveTarget
                ? `«${archiveTarget.number}» irá a Archivados durante ${EXPENSE_ARCHIVE_RETENTION_DAYS} días.`
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
              Archivar {bulkArchiveIds?.length ?? 0} gasto
              {bulkArchiveIds && bulkArchiveIds.length === 1 ? '' : 's'}
            </DialogTitle>
            <DialogDescription>
              Los gastos seleccionados irán a Archivados durante {EXPENSE_ARCHIVE_RETENTION_DAYS}{' '}
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
        title="Editar gastos seleccionados"
        fields={[
          {
            key: 'status',
            label: 'Estado',
            options: EXPENSE_STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
          {
            key: 'category',
            label: 'Categoría',
            options: EXPENSE_CATEGORY_OPTIONS.map((c) => ({ value: c, label: c })),
          },
          {
            key: 'paymentMethod',
            label: 'Método de pago',
            options: EXPENSE_PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m, label: m })),
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
