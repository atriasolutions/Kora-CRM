import { Archive, Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { updateInvoiceApi } from '@/api/invoices'
import { InvoicesArchivedView } from '@/components/invoices/InvoicesArchivedView'
import { InvoicesKanbanView } from '@/components/invoices/InvoicesKanbanView'
import {
  InvoicesModuleHeader,
  type InvoicesViewId,
} from '@/components/invoices/InvoicesModuleHeader'
import { InvoicesSegmentsView } from '@/components/invoices/InvoicesSegmentsView'
import { CreateInvoiceDialog } from '@/components/invoices/CreateInvoiceDialog'
import { DuplicateInvoiceDialog } from '@/components/invoices/DuplicateInvoiceDialog'
import { EditInvoiceDialog } from '@/components/invoices/EditInvoiceDialog'
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
import { invoicingListConfig } from '@/config/list-modules/invoicing'
import type { InvoiceDetail } from '@/data/invoice-detail.mock'
import { isApiEnabled } from '@/api/config'
import { resolveInvoiceListItem } from '@/data/invoice-detail.mock'
import { loadInvoiceDetail } from '@/lib/entity-detail-loaders'
import type { InvoiceListItem } from '@/data/invoices.mock'
import { apiActionErrorMessage } from '@/api/errors'
import { useInvoicesRegistry } from '@/hooks/use-invoices-registry'
import { fetchInvoicesServerPage } from '@/lib/module-server-list'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import {
  duplicateInvoiceFormValues,
  type CreateInvoiceFormValues,
} from '@/lib/invoice-create'
import {
  createDefaultInvoiceFilters,
  invoiceFiltersToServerQuery,
  invoiceRowMatchesFilters,
  INVOICE_PAYMENT_METHOD_OPTIONS,
  INVOICE_STATUS_OPTIONS,
  type InvoiceFilters,
} from '@/lib/invoice-filters'
import { INVOICE_ARCHIVE_RETENTION_DAYS } from '@/lib/invoice-archive'
import { withResolvedInvoiceListStatus } from '@/lib/invoice-display'
import {
  invoiceMatchesListScope,
  loadInvoiceRecentIds,
  sortInvoicesByRecentlyViewed,
  type InvoiceListScope,
} from '@/lib/invoice-list-scope'
import { getCurrentUser } from '@/lib/current-user'
import { SiiDocumentsPanel } from '@/components/invoices/SiiDocumentsPanel'
import { useOrganizationSettings } from '@/hooks/use-organization-settings'

export function InvoicesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { canEdit, canDelete } = useModulePermissions('facturacion')
  const {
    allInvoices,
    addInvoice,
    updateInvoiceFromDetail,
    archiveInvoice,
    archiveInvoices,
    archivedInvoices,
    isArchived,
    reloadFromApi,
  } = useInvoicesRegistry()
  const { settings: orgSettings } = useOrganizationSettings()

  const [view, setView] = useState<InvoicesViewId>('lista')
  const [listScope, setListScope] = useState<InvoiceListScope>('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<InvoiceFilters>(() =>
    createDefaultInvoiceFilters(),
  )
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()

  const recentIds = useMemo(
    () => loadInvoiceRecentIds(),
    [listRefreshKey, location.key, listScope],
  )

  const serverListQuery = useMemo(
    () =>
      invoiceFiltersToServerQuery(filters, {
        mine: listScope === 'mine',
        ownerName: getCurrentUser().name,
      }),
    [filters, listScope],
  )

  const filtersOnServer = listScope !== 'recent' && isApiEnabled()

  const rowPredicate = useMemo(
    () => (row: InvoiceListItem) =>
      invoiceRowMatchesFilters(row, filters) &&
      !isArchived(row.id) &&
      invoiceMatchesListScope(row, listScope, recentIds),
    [filters, isArchived, listScope, recentIds],
  )

  const postFilterSort = useMemo(() => {
    if (listScope !== 'recent') return undefined
    return (rows: InvoiceListItem[]) => sortInvoicesByRecentlyViewed(rows, recentIds)
  }, [listScope, recentIds])

  useEffect(() => {
    if (location.pathname === '/facturacion') {
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
  const [createInitial, setCreateInitial] = useState<Partial<CreateInvoiceFormValues>>()
  const [createTitle, setCreateTitle] = useState('Nueva factura')
  const [editOpen, setEditOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<InvoiceDetail | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<InvoiceListItem | null>(null)
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null)
  const [bulkEditIds, setBulkEditIds] = useState<string[] | null>(null)
  const [bulkEditSaving, setBulkEditSaving] = useState(false)

  const handleCreateSubmit = useCallback(
    async (values: CreateInvoiceFormValues) => {
      try {
        const item = await addInvoice(values)
        toast.success(`Factura «${item.number}» creada correctamente.`)
        navigate(`/facturacion/${item.id}`)
      } catch {
        toast.error('No se pudo crear la factura.')
      }
    },
    [addInvoice, navigate],
  )

  const handleDuplicateSelect = useCallback(async (source: InvoiceListItem) => {
    try {
      const detail = await loadInvoiceDetail(source.id)
      setCreateInitial(
        duplicateInvoiceFormValues(
          source,
          detail.lineItems,
          detail.discountPercent ?? detail.globalDiscount,
        ),
      )
      setCreateTitle('Duplicar factura')
      setCreateOpen(true)
    } catch {
      toast.error('No se pudo cargar la factura para duplicar.')
    }
  }, [])

  const resolveListRow = useCallback(
    (row: InvoiceListItem) => {
      const base = isApiEnabled() ? row : resolveInvoiceListItem(row.id)
      return withResolvedInvoiceListStatus(base)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listRefreshKey],
  )

  const openEditInvoice = useCallback(async (row: InvoiceListItem) => {
    try {
      setEditingInvoice(await loadInvoiceDetail(row.id))
      setEditOpen(true)
    } catch {
      toast.error('No se pudo cargar la factura.')
    }
  }, [])

  const handleEditSaved = useCallback(
    async (updated: InvoiceDetail) => {
      try {
        await updateInvoiceFromDetail(updated)
        setListRefreshKey((k) => k + 1)
        toast.success(`Factura «${updated.number}» actualizada correctamente.`)
      } catch {
        toast.error('No se pudo actualizar la factura.')
      }
    },
    [updateInvoiceFromDetail],
  )

  const openArchiveInvoice = useCallback((row: InvoiceListItem) => {
    setArchiveTarget(row)
  }, [])

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    const number = archiveTarget.number
    try {
      await archiveInvoice(archiveTarget.id)
      setArchiveTarget(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`Factura «${number}» archivada.`)
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar la factura.'),
      )
    }
  }, [archiveInvoice, archiveTarget])

  const handleBulkArchiveConfirm = useCallback(async () => {
    if (!bulkArchiveIds?.length) return
    const count = bulkArchiveIds.length
    try {
      await archiveInvoices(bulkArchiveIds)
      setBulkArchiveIds(null)
      setListRefreshKey((k) => k + 1)
      toast.success(
        `${count} factura${count === 1 ? '' : 'es'} archivada${count === 1 ? '' : 's'}.`,
      )
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudieron archivar las facturas.'),
      )
    }
  }, [archiveInvoices, bulkArchiveIds])

  const handleBulkEdit = useCallback(
    async (patch: Record<string, string>) => {
      if (!bulkEditIds?.length) return
      setBulkEditSaving(true)
      let ok = 0
      let fail = 0
      try {
        for (const id of bulkEditIds) {
          try {
            await updateInvoiceApi(id, {
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
          toast.success(`${ok} factura${ok === 1 ? '' : 's'} actualizada${ok === 1 ? '' : 's'}.`)
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
      {orgSettings.invoicingMode === 'sii' ? (
        <div className="mb-4 px-4 sm:px-6">
          <SiiDocumentsPanel />
        </div>
      ) : null}
      <ListPageLayout
        header={
          <InvoicesModuleHeader
        view={view}
        onViewChange={setView}
        query={query}
        onQueryChange={setQuery}
        onCreateNew={() => {
          setCreateInitial(undefined)
          setCreateTitle('Nueva factura')
          setCreateOpen(true)
        }}
        onDuplicate={() => setDuplicateOpen(true)}
        filters={filters}
        onFiltersChange={setFilters}
        listScope={listScope}
        onListScopeChange={setListScope}
        archivedCount={archivedInvoices.length}
        toolbarEnd={view === 'lista' ? toolbarSlot : undefined}
      />
        }
      >
            

      {view === 'lista' ? (
        <ModuleListPage
          config={invoicingListConfig}
          embedded
          toolbarHost={toolbarHost}
          searchQuery={query}
          extraSeeds={listScope === 'recent' ? allInvoices : []}
          serverList={
            listScope === 'recent'
              ? undefined
              : {
                  fetchPage: (params) =>
                    fetchInvoicesServerPage(params, false, serverListQuery),
                  resetKey: `${listRefreshKey}-${listScope}-${JSON.stringify(serverListQuery)}`,
                  filtersOnServer,
                }
          }
          rowPredicate={rowPredicate}
          resolveRow={resolveListRow}
          onEditRow={canEdit ? openEditInvoice : undefined}
          onArchiveRow={canDelete ? openArchiveInvoice : undefined}
          postFilterSort={postFilterSort}
          selectionActions={listSelectionActions}
          clearSelectionKey={listRefreshKey}
        />
      ) : null}

      {view === 'kanban' ? (
        <InvoicesKanbanView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
        />
      ) : null}

      {view === 'segmentos' ? (
        <InvoicesSegmentsView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
        />
      ) : null}

      {view === 'archivados' ? (
        <InvoicesArchivedView query={query} />
      ) : null}

      </ListPageLayout>
      <CreateInvoiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={createTitle}
        description={
          createTitle === 'Duplicar factura'
            ? 'Revisa los datos copiados y guarda el nuevo registro.'
            : undefined
        }
        initialValues={createInitial}
        onSubmit={handleCreateSubmit}
      />

      <DuplicateInvoiceDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        invoices={allInvoices}
        onSelectDuplicate={handleDuplicateSelect}
      />

      {canEdit && editingInvoice ? (
        <EditInvoiceDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) setEditingInvoice(null)
          }}
          invoice={editingInvoice}
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
            <DialogTitle>Archivar factura</DialogTitle>
            <DialogDescription>
              {archiveTarget
                ? `«${archiveTarget.number}» irá a Archivados (papelera) durante ${INVOICE_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma definitiva.`
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
              Archivar {bulkArchiveIds?.length ?? 0} factura
              {bulkArchiveIds && bulkArchiveIds.length === 1 ? '' : 'es'}
            </DialogTitle>
            <DialogDescription>
              Las facturas seleccionadas irán a Archivados durante{' '}
              {INVOICE_ARCHIVE_RETENTION_DAYS} días. Podrás restaurarlas o eliminarlas desde la
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
        title="Editar facturas seleccionadas"
        fields={[
          {
            key: 'status',
            label: 'Estado',
            options: INVOICE_STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
          {
            key: 'paymentMethod',
            label: 'Método de pago',
            options: INVOICE_PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m, label: m })),
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
