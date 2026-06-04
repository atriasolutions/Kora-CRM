import {
  ArrowDownToLine,
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  LayoutList,
  ListOrdered,
  StickyNote,
  Warehouse,
  Zap,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { ContactActivitiesPanel } from '@/components/contacts/ContactActivitiesPanel'
import { RegisterActivityDialog } from '@/components/contacts/RegisterActivityDialog'
import { CreateStockReceiptDialog } from '@/components/stock-receipts/CreateStockReceiptDialog'
import { EditPurchaseDialog } from '@/components/purchases/EditPurchaseDialog'
import { PurchaseRelatedStockReceiptsPanel } from '@/components/purchases/PurchaseRelatedStockReceiptsPanel'
import { PurchaseInboundPendingBanner } from '@/components/purchases/PurchaseInboundPendingBanner'
import { PurchaseDetailOverview } from '@/components/purchases/PurchaseDetailOverview'
import { PurchaseDetailHeader } from '@/components/purchases/PurchaseDetailHeader'
import { PurchaseDetailSidebar } from '@/components/purchases/PurchaseDetailSidebar'
import { PurchaseFilesPanel } from '@/components/purchases/PurchaseFilesPanel'
import { PurchaseLineItemsPanel } from '@/components/purchases/PurchaseLineItemsPanel'
import { PurchaseRelatedInventoryPanel } from '@/components/purchases/PurchaseRelatedInventoryPanel'
import { PurchaseSuccessPath } from '@/components/purchases/PurchaseSuccessPath'
import { RecordAuditMeta } from '@/components/shared/RecordAuditMeta'
import { EntityNotesPanel } from '@/components/shared/EntityNotesPanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ContactActivity, ContactActivityType } from '@/data/contact-detail.mock'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import { loadPurchaseDetail } from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { stockReceiptsForPurchase } from '@/data/stock-receipt-detail.mock'
import { useEntityNotes } from '@/hooks/use-entity-notes'
import { usePurchasesRegistry } from '@/hooks/use-purchases-registry'
import { useStockReceiptsRegistry } from '@/hooks/use-stock-receipts-registry'
import { mergePurchaseLinesWithIngresos } from '@/lib/purchase-lines'
import { stockReceiptInitialFromPurchase } from '@/lib/stock-receipt-form'
import type { StockReceiptFormValues } from '@/lib/stock-receipt-form'
import { isApiEnabled } from '@/api/config'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import { PURCHASE_ARCHIVE_RETENTION_DAYS } from '@/lib/purchase-archive'
import { persistPurchaseFiles } from '@/lib/purchase-files'
import {
  buildPurchaseStageHistoryOnTransition,
  canTransition,
  journeyStageToListStatus,
  savePurchaseJourneyOverride,
  type PurchaseJourneyStage,
} from '@/lib/purchase-journey'
import {
  parsePurchaseDetailTab,
  type PurchaseDetailTab,
} from '@/lib/purchase-routes'
import { apiActionErrorMessage } from '@/api/errors'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

const tabs: { id: PurchaseDetailTab; label: string; Icon: typeof Zap }[] = [
  { id: 'detalle', label: 'Detalle', Icon: LayoutList },
  { id: 'actividad', label: 'Actividad', Icon: Zap },
  { id: 'lineas', label: 'Líneas', Icon: ListOrdered },
  { id: 'ingresos', label: 'Ingresos de stock', Icon: ArrowDownToLine },
  { id: 'inventario', label: 'Inventario', Icon: Warehouse },
  { id: 'notas', label: 'Notas', Icon: StickyNote },
  { id: 'archivos', label: 'Archivos', Icon: FolderOpen },
]

export function PurchaseDetailPage() {
  const navigate = useNavigate()
  const { purchaseId } = useParams<{ purchaseId: string }>()
  const { canEdit, canDelete } = useModulePermissions('compras')
  const { archivePurchase, isArchived, updatePurchaseFromDetail } = usePurchasesRegistry()
  const { addReceipt, allReceipts } = useStockReceiptsRegistry()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: PurchaseDetailTab = parsePurchaseDetailTab(searchParams) ?? 'detalle'
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null)
  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: purchaseId,
    load: loadPurchaseDetail,
    isArchived,
    onLoaded: (id, record) => {
      setPurchase(record)
      recordEntityView('compras', id)
    },
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [activityPresetType, setActivityPresetType] =
    useState<ContactActivityType>('llamada')
  const [inventoryCount, setInventoryCount] = useState(0)
  const [stockReceiptOpen, setStockReceiptOpen] = useState(false)
  const [receiptsRefreshKey, setReceiptsRefreshKey] = useState(0)

  const selectTab = useCallback(
    (next: PurchaseDetailTab) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (next === 'detalle') {
            params.delete('tab')
          } else {
            params.set('tab', next)
          }
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const handlePurchaseSaved = useCallback(
    async (updated: PurchaseDetail) => {
      const saved = await updatePurchaseFromDetail(updated)
      setPurchase(saved)
    },
    [updatePurchaseFromDetail],
  )

  const handleArchiveConfirm = useCallback(async () => {
    if (!purchaseId) return
    try {
      await archivePurchase(purchaseId)
      setArchiveOpen(false)
      navigate('/compras')
      toast.success('Compra archivada.')
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar la compra.'),
      )
    }
  }, [archivePurchase, purchaseId, navigate])

  const openRegisterActivity = useCallback(
    (presetType: ContactActivityType = 'llamada') => {
      setActivityPresetType(presetType)
      setActivityDialogOpen(true)
    },
    [],
  )

  const handleActivitySaved = useCallback(
    (activity: ContactActivity) => {
      setPurchase((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          activities: [activity, ...prev.activities],
        }
      })
      selectTab('actividad')
    },
    [selectTab],
  )

  const { onAddNote: handleAddNote, onDeleteNote: handleDeleteNote } = useEntityNotes({
    scope: 'compra',
    entityId: purchaseId,
    setRecord: setPurchase,
    onAdded: () => selectTab('notas'),
    onAfterChange: (next) => {
      void updatePurchaseFromDetail(next)
    },
  })

  const handleFilesChange = useCallback(
    async (files: PurchaseDetail['files']) => {
      if (!purchase) return
      setPurchase((prev) => (prev ? { ...prev, files } : prev))
      try {
        const saved = await persistPurchaseFiles(
          purchase.id,
          purchase.reference,
          files,
        )
        setPurchase((prev) => (prev ? { ...prev, files: saved } : prev))
      } catch (error) {
        toast.error(
          apiActionErrorMessage(error, 'No se pudieron guardar los archivos.'),
        )
      }
    },
    [purchase],
  )

  const stockReceiptsCount = useMemo(() => {
    if (!purchase) return 0
    return stockReceiptsForPurchase(purchase.id).length
  }, [purchase, receiptsRefreshKey])

  if (loadState === 'loading') {
    return <RecordDetailLoading />
  }

  if (loadState === 'unavailable') {
    return (
      <RecordUnavailableView
        module="compras"
        reason={reason}
        detail={unavailableDetail}
        recordId={purchaseId}
      onRetry={reload}
      />
    )
  }

  if (!purchase) {
    return <RecordDetailLoading />
  }

  return (
    <PageScrollArea className="space-y-4 p-3 pb-8 sm:space-y-5 sm:p-4 sm:pb-10 lg:p-6">
      <nav aria-label="Miga de pan" className="flex flex-wrap items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link to="/compras">
            <ArrowLeft aria-hidden className="size-4" />
            Compras
          </Link>
        </Button>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        <span className="truncate font-medium text-foreground">
          {purchase.supplier.trim() || purchase.productSummary.trim() || 'Orden de compra'}
        </span>
      </nav>

      <PurchaseDetailHeader
        purchase={purchase}
        onStartEdit={canEdit ? () => setEditDialogOpen(true) : undefined}
        onRegisterActivity={openRegisterActivity}
        onStockReceipt={() => setStockReceiptOpen(true)}
        onArchive={canDelete ? () => setArchiveOpen(true) : undefined}
      />

      <CreateStockReceiptDialog
        open={stockReceiptOpen}
        onOpenChange={setStockReceiptOpen}
        lockPurchase
        title="Ingresar a stock"
        description="Crea un ingreso vinculado a esta OC. Puedes modificar las líneas antes de confirmar el ingreso en el detalle."
        initialValues={stockReceiptInitialFromPurchase(purchase)}
        purchaseLineItems={purchase.lineItems}
        existingNumbers={allReceipts.map((r) => r.number)}
        onSubmit={async (values: StockReceiptFormValues) => {
          const item = await addReceipt(values)
          setReceiptsRefreshKey((k) => k + 1)
          navigate(`/ingresos/${item.id}`)
        }}
      />

      {canEdit ? (
        <EditPurchaseDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          purchase={purchase}
          onSave={handlePurchaseSaved}
        />
      ) : null}

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar compra</DialogTitle>
            <DialogDescription>
              «{purchase.reference}» irá a Archivados (papelera) durante{' '}
              {PURCHASE_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma definitiva si no
              la restauras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setArchiveOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleArchiveConfirm}>
              Archivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RegisterActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        relatedType="compra"
        contactId={purchase.id}
        contactName={purchase.supplier.trim() || purchase.reference}
        companyName={purchase.supplier}
        defaultAuthor={purchase.owner}
        presetType={activityPresetType}
        onSaved={handleActivitySaved}
      />

      <PurchaseSuccessPath
        currentStage={purchase.stage}
        history={purchase.stageHistory}
        onStageChange={(stage: PurchaseJourneyStage) => {
          if (
            !canTransition(purchase.stage, stage, {
              history: purchase.stageHistory,
            })
          ) {
            return
          }
          if (!isApiEnabled()) {
            savePurchaseJourneyOverride(purchase.id, stage)
          }
          const listStatus = journeyStageToListStatus(stage)
          setPurchase((prev) => {
            if (!prev) return prev
            const updated = {
              ...prev,
              stage,
              status: listStatus,
              stageHistory: buildPurchaseStageHistoryOnTransition(
                prev.stage,
                stage,
                prev.stageHistory,
              ),
            }
            void updatePurchaseFromDetail(updated).then((saved) => {
              setPurchase(saved)
            })
            return updated
          })
        }}
      />

      <PurchaseInboundPendingBanner purchase={purchase} />

      <div className="min-w-0 space-y-4">
        <div
          className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Secciones de la compra"
        >
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => selectTab(id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:gap-2 sm:px-4 sm:py-2.5',
                  tab === id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon aria-hidden className="size-4 opacity-70" />
                {label}
                {id === 'lineas' && purchase.lineItems.length > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {purchase.lineItems.length}
                  </Badge>
                ) : null}
                {id === 'ingresos' && stockReceiptsCount > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {stockReceiptsCount}
                  </Badge>
                ) : null}
                {id === 'inventario' && inventoryCount > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {inventoryCount}
                  </Badge>
                ) : null}
                {id === 'archivos' && purchase.files.length > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {purchase.files.length}
                  </Badge>
                ) : null}
              </button>
            ))}
        </div>

        {tab === 'detalle' ? (
          <div className="space-y-4">
            <PurchaseDetailOverview purchase={purchase} />
            <PurchaseDetailSidebar purchase={purchase} />
            <RecordAuditMeta record={purchase} />
          </div>
        ) : null}

        {tab === 'actividad' ? (
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-semibold">Actividades</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border"
                  onClick={() => openRegisterActivity()}
                >
                  Registrar actividad
                </Button>
              </CardHeader>
              <CardContent>
                <ContactActivitiesPanel
                  activities={purchase.activities}
                  entityKind="compra"
                  onRegister={() => openRegisterActivity()}
                />
              </CardContent>
            </Card>
          ) : null}

          {tab === 'lineas' ? <PurchaseLineItemsPanel purchase={purchase} /> : null}

          {tab === 'ingresos' ? (
            <PurchaseRelatedStockReceiptsPanel
              key={receiptsRefreshKey}
              purchaseId={purchase.id}
            />
          ) : null}

          {tab === 'inventario' ? (
            <PurchaseRelatedInventoryPanel
              purchase={purchase}
              onCountChange={setInventoryCount}
            />
          ) : null}

          {tab === 'notas' ? (
            <EntityNotesPanel
              notes={purchase.notes}
              authorName={purchase.owner}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
            />
          ) : null}

          {tab === 'archivos' ? (
            <PurchaseFilesPanel
              authorName={purchase.owner}
              files={purchase.files}
              onFilesChange={handleFilesChange}
            />
          ) : null}
      </div>
    </PageScrollArea>
  )
}
