import { ChevronRight, LayoutList, ListOrdered, StickyNote } from 'lucide-react'
import { useCallback, useState } from 'react'
import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { EditStockReceiptDialog } from '@/components/stock-receipts/EditStockReceiptDialog'
import { StockReceiptDetailHeader } from '@/components/stock-receipts/StockReceiptDetailHeader'
import { StockReceiptDetailSidebar } from '@/components/stock-receipts/StockReceiptDetailSidebar'
import { StockReceiptLineItemsPanel } from '@/components/stock-receipts/StockReceiptLineItemsPanel'
import { EntityNotesPanel } from '@/components/shared/EntityNotesPanel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useEntityNotes } from '@/hooks/use-entity-notes'
import type { StockReceiptDetail } from '@/data/stock-receipt-detail.mock'
import { loadStockReceiptDetail } from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { usePurchasesRegistry } from '@/hooks/use-purchases-registry'
import { useStockReceiptsRegistry } from '@/hooks/use-stock-receipts-registry'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import { STOCK_RECEIPT_ARCHIVE_RETENTION_DAYS } from '@/lib/stock-receipt-archive'
import { archiveStockReceiptCopy } from '@/lib/stock-receipt-lifecycle-messages'
import { STOCK_RECEIPT_RECENT_SLUG } from '@/lib/stock-receipt-list-scope'
import type { StockReceiptFormValues } from '@/lib/stock-receipt-form'
import { syncPurchaseAfterStockReceipt } from '@/lib/stock-receipt-purchase-sync'
import { apiActionErrorMessage } from '@/api/errors'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type DetailTab = 'detalle' | 'lineas' | 'notas'

const tabs: { id: DetailTab; label: string; Icon: typeof LayoutList }[] = [
  { id: 'detalle', label: 'Detalle', Icon: LayoutList },
  { id: 'lineas', label: 'Líneas', Icon: ListOrdered },
  { id: 'notas', label: 'Notas', Icon: StickyNote },
]

export function StockReceiptDetailPage() {
  const navigate = useNavigate()
  const { receiptId } = useParams<{ receiptId: string }>()
  const { canEdit, canDelete } = useModulePermissions('ingresos')
  const {
    confirmReceipt,
    updateReceiptFromDetail,
    archiveReceipt,
    isArchived,
  } = useStockReceiptsRegistry()
  const { updatePurchaseFromDetail } = usePurchasesRegistry()
  const [receipt, setReceipt] = useState<StockReceiptDetail | null>(null)
  const { loadState, reason, unavailableDetail, reload: reloadReceipt } = useRecordDetail({
    id: receiptId,
    load: loadStockReceiptDetail,
    isArchived,
    onLoaded: (id, record) => {
      setReceipt(record)
      recordEntityView(STOCK_RECEIPT_RECENT_SLUG, id)
    },
  })
  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [tab, setTab] = useState<DetailTab>('detalle')

  const persistReceipt = useCallback(
    (next: StockReceiptDetail, message?: string) => {
      updateReceiptFromDetail(next)
      setReceipt(next)
      if (message) toast.success(message)
    },
    [updateReceiptFromDetail],
  )

  const handleConfirm = async () => {
    if (!receipt || receipt.status !== 'Borrador') return
    setConfirming(true)
    const result = await confirmReceipt(receipt, {
      onPurchaseUpdated: (purchaseId) => {
        const updated = syncPurchaseAfterStockReceipt(purchaseId, receipt.lineItems)
        if (updated) void updatePurchaseFromDetail(updated)
      },
    })
    setConfirming(false)
    if (!result.ok) {
      toast.warning(result.message ?? 'No se pudo confirmar el ingreso.')
      return
    }
    toast.success(result.message ?? 'Stock ingresado correctamente.')
    reloadReceipt()
  }

  const handleEditSaved = (values: StockReceiptFormValues) => {
    if (!receipt) return
    const lineItems = values.lineItems
      .filter((li) => li.sku.trim())
      .map((li) => ({
        ...li,
        quantity: Math.max(1, Math.floor(li.quantity) || 1),
      }))
    const updated: StockReceiptDetail = {
      ...receipt,
      externalReference: values.externalReference,
      warehouse: values.warehouse,
      purchaseId: values.purchaseId || undefined,
      purchaseReference: values.purchaseReference || undefined,
      supplier: values.supplier || undefined,
      owner: values.ownerName,
      lineItems,
      memo: values.memo,
    }
    persistReceipt(updated, 'Ingreso actualizado.')
    setEditOpen(false)
  }

  const { onAddNote: handleAddNote, onDeleteNote: handleDeleteNote } = useEntityNotes({
    scope: 'recepcion',
    entityId: receiptId,
    setRecord: setReceipt,
    onAdded: () => setTab('notas'),
    onAfterChange: (next) => {
      persistReceipt(next)
    },
  })

  const handleArchiveConfirm = async () => {
    if (!receiptId) return
    try {
      await archiveReceipt(receiptId)
      setArchiveOpen(false)
      navigate('/ingresos')
      toast.success('Ingreso archivado.')
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar el ingreso.'),
      )
    }
  }

  if (loadState === 'loading') {
    return <RecordDetailLoading />
  }

  if (loadState === 'unavailable') {
    return (
      <RecordUnavailableView
        module="ingresos"
        reason={reason}
        detail={unavailableDetail}
        recordId={receiptId}
        onRetry={reloadReceipt}
      />
    )
  }

  if (!receipt) {
    return <RecordDetailLoading />
  }

  const isDraft = receipt.status === 'Borrador'
  const archiveCopy = archiveStockReceiptCopy(
    receipt.status,
    receipt.number,
    STOCK_RECEIPT_ARCHIVE_RETENTION_DAYS,
  )

  return (
    <PageScrollArea className="space-y-4 p-3 pb-8 sm:space-y-5 sm:p-4 sm:pb-10 lg:p-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link to="/ingresos" className="font-medium text-primary hover:underline">
          Ingresos
        </Link>
        <ChevronRight aria-hidden className="size-4" />
        <span className="font-medium text-foreground">{receipt.number}</span>
      </nav>

      <StockReceiptDetailHeader
        receipt={receipt}
        confirming={confirming}
        onStartEdit={canEdit ? () => setEditOpen(true) : undefined}
        onConfirm={isDraft ? handleConfirm : undefined}
        onArchive={canDelete ? () => setArchiveOpen(true) : undefined}
      />

      {!isDraft ? (
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Este ingreso está confirmado: el stock ya está en bodega. Para corregir cantidades,
          usa <strong>Anular</strong> desde la papelera (revierte stock y libera pendiente en la
          OC) o archiva el documento si solo quieres ocultarlo sin mover inventario.
        </p>
      ) : null}

      <div
        className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Secciones del ingreso"
      >
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:gap-2 sm:px-4 sm:py-2.5',
              tab === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon aria-hidden className="size-4 opacity-70" />
            {label}
          </button>
        ))}
      </div>

      <div className="min-w-0 space-y-4">
        {tab === 'detalle' ? (
          <div className="space-y-4">
            <StockReceiptDetailSidebar receipt={receipt} />
            <StockReceiptLineItemsPanel lineItems={receipt.lineItems} />
            {receipt.memo?.trim() ? (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground">Observaciones</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                  {receipt.memo}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'lineas' ? (
          <div className="space-y-3">
            {isDraft && canEdit ? (
              <p className="text-sm text-muted-foreground">
                Las líneas se muestran en solo lectura. Usa{' '}
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                  onClick={() => setEditOpen(true)}
                >
                  Editar
                </button>{' '}
                para agregar productos, cambiar cantidades (enteros positivos) y ajustar bodega u
                observaciones.
              </p>
            ) : null}
            <StockReceiptLineItemsPanel lineItems={receipt.lineItems} />
          </div>
        ) : null}

        {tab === 'notas' ? (
          <EntityNotesPanel
            notes={receipt.notes}
            authorName={receipt.owner}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
          />
        ) : null}
      </div>

      {canEdit ? (
        <EditStockReceiptDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          receipt={receipt}
          onSubmit={handleEditSaved}
        />
      ) : null}

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{archiveCopy.title}</DialogTitle>
            <DialogDescription>{archiveCopy.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setArchiveOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleArchiveConfirm}>
              {archiveCopy.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageScrollArea>
  )
}
