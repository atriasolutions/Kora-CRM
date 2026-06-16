import {
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  LayoutList,
  StickyNote,
  Zap,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { EditInvoiceDialog } from '@/components/invoices/EditInvoiceDialog'
import { CreateInvoiceAdjustmentDialog } from '@/components/invoices/CreateInvoiceAdjustmentDialog'
import { InvoiceDetailHeader } from '@/components/invoices/InvoiceDetailHeader'
import { InvoiceDetailSidebar } from '@/components/invoices/InvoiceDetailSidebar'
import { InvoiceEmitSiiDialog } from '@/components/invoices/InvoiceEmitSiiDialog'
import { InvoiceFilesPanel } from '@/components/invoices/InvoiceFilesPanel'
import { InvoiceLineItemsPanel } from '@/components/invoices/InvoiceLineItemsPanel'
import { InvoiceRelatedAdjustmentsPanel } from '@/components/invoices/InvoiceRelatedAdjustmentsPanel'
import { InvoiceSiiFolioCard } from '@/components/invoices/InvoiceSiiFolioCard'
import { InvoiceSuccessPath } from '@/components/invoices/InvoiceSuccessPath'
import { RegisterActivityDialog } from '@/components/contacts/RegisterActivityDialog'
import { EntityActivitiesSection } from '@/components/shared/EntityActivitiesSection'
import { EntityNotesPanel } from '@/components/shared/EntityNotesPanel'
import { RecordAuditMeta } from '@/components/shared/RecordAuditMeta'
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
import type { InvoiceDetail } from '@/data/invoice-detail.mock'
import { loadInvoiceDetail } from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useInvoicesRegistry } from '@/hooks/use-invoices-registry'
import { useEntityNotes } from '@/hooks/use-entity-notes'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import { INVOICE_ARCHIVE_RETENTION_DAYS } from '@/lib/invoice-archive'
import { persistInvoiceFiles } from '@/lib/invoice-files'
import {
  buildInvoiceJourneyHistoryOnTransition,
  canTransition,
  isMainLineStage,
  isOffRouteStage,
  saveInvoiceJourneyOverride,
  type InvoiceJourneyStage,
} from '@/lib/invoice-journey'
import { INVOICE_EMITTED_STATUS } from '@/lib/invoice-sii'
import { emitInvoiceToSiiApi } from '@/api/sii'
import {
  createCreditNoteApi,
  createDebitNoteApi,
  type CreateInvoiceAdjustmentBody,
} from '@/api/invoices'
import { useOrganizationSettings } from '@/hooks/use-organization-settings'
import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import { handleInvoiceStatusStockChange } from '@/lib/stock-service'
import { toast } from '@/lib/toast'
import { canCreateAdjustments } from '@/lib/invoice-dte'
import { cn } from '@/lib/utils'

type DetailTab = 'detalle' | 'actividad' | 'archivos' | 'notas'

const tabs: { id: DetailTab; label: string; Icon: typeof LayoutList }[] = [
  { id: 'detalle', label: 'Detalle', Icon: LayoutList },
  { id: 'actividad', label: 'Actividad', Icon: Zap },
  { id: 'archivos', label: 'Archivos', Icon: FolderOpen },
  { id: 'notas', label: 'Notas', Icon: StickyNote },
]

export function InvoiceDetailPage() {
  const navigate = useNavigate()
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const { canEdit, canDelete } = useModulePermissions('facturacion')
  const { settings: orgSettings } = useOrganizationSettings()
  const invoicingMode = orgSettings.invoicingMode ?? 'manual'
  const { archiveInvoice, isArchived, patchInvoiceStatus, updateInvoiceFromDetail } =
    useInvoicesRegistry()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: invoiceId,
    load: loadInvoiceDetail,
    isArchived,
    onLoaded: (id, record) => {
      setInvoice(record)
      recordEntityView('facturacion', id)
    },
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [tab, setTab] = useState<DetailTab>('detalle')
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [activityPresetType, setActivityPresetType] =
    useState<ContactActivityType>('llamada')
  const [stockMessage, setStockMessage] = useState<string | null>(null)
  const [emitSiiOpen, setEmitSiiOpen] = useState(false)
  const [emittingSii, setEmittingSii] = useState(false)
  const [pendingEmitStage, setPendingEmitStage] = useState<InvoiceJourneyStage | null>(
    null,
  )
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [adjustmentKind, setAdjustmentKind] = useState<'credit_note' | 'debit_note'>(
    'credit_note',
  )

  const handleEmitToSii = useCallback(async () => {
    if (!invoice || !canEdit) return
    setEmittingSii(true)
    try {
      const result = await emitInvoiceToSiiApi(invoice.id)
      await reload()
      toast.success(
        result.trackId
          ? `Factura emitida al SII. Folio ${result.siiNumber} · Track ${result.trackId}`
          : `Factura emitida. Folio SII ${result.siiNumber}`,
      )
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudo emitir al SII.'))
    } finally {
      setEmittingSii(false)
    }
  }, [canEdit, invoice, reload])

  const openRegisterActivity = useCallback(
    (presetType: ContactActivityType = 'llamada') => {
      setActivityPresetType(presetType)
      setActivityDialogOpen(true)
    },
    [],
  )

  const handleActivitySaved = useCallback((activity: ContactActivity) => {
    setInvoice((prev) => {
      if (!prev) return prev
      const next = { ...prev, activities: [activity, ...prev.activities] }
      updateInvoiceFromDetail(next)
      return next
    })
    setTab('actividad')
  }, [updateInvoiceFromDetail])

  const { onAddNote: handleNoteAdded, onDeleteNote: handleNoteDeleted } = useEntityNotes({
    scope: 'factura',
    entityId: invoiceId,
    setRecord: setInvoice,
    onAdded: () => setTab('notas'),
    onAfterChange: (next) => {
      updateInvoiceFromDetail(next)
    },
  })

  const applyStageChange = useCallback(
    async (stage: InvoiceJourneyStage, siiNumber?: string) => {
      if (!invoice) return

      const previousStatus = invoice.status
      const nextSii =
        stage === 'Borrador'
          ? ''
          : siiNumber !== undefined
            ? siiNumber
            : invoice.siiNumber

      const nextInvoice: InvoiceDetail = {
        ...invoice,
        status: stage,
        siiNumber: nextSii,
        statusHistory: buildInvoiceJourneyHistoryOnTransition(
          invoice.status,
          stage,
          invoice.statusHistory,
        ),
      }

      const pausedFromMain =
        isOffRouteStage(stage) && isMainLineStage(previousStatus)
          ? previousStatus
          : undefined

      try {
        const updated = await patchInvoiceStatus(invoice.id, stage, nextSii)
        if (!isApiEnabled()) {
          saveInvoiceJourneyOverride(invoice.id, stage, nextSii, pausedFromMain)
          const result = handleInvoiceStatusStockChange(
            invoice.id,
            invoice.number,
            previousStatus,
            stage,
          )
          if (result.message) setStockMessage(result.message)
        } else {
          saveInvoiceJourneyOverride(invoice.id, stage, nextSii, pausedFromMain)
        }
        setInvoice({
          ...invoice,
          ...updated,
          status: stage,
          siiNumber: nextSii,
          statusHistory: nextInvoice.statusHistory,
        })
        setPendingEmitStage(null)
        setStockMessage(null)
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'No se pudo guardar el cambio de estado en el servidor.'
        toast.warning(message)
        setStockMessage(null)
      }
    },
    [invoice, patchInvoiceStatus],
  )

  const handleStageChange = useCallback(
    (stage: InvoiceJourneyStage) => {
      if (!invoice || !canEdit) return
      if (
        !canTransition(invoice.status, stage, {
          history: invoice.statusHistory,
        })
      ) {
        return
      }

      if (stage === INVOICE_EMITTED_STATUS && invoice.status === 'Borrador') {
        if (invoicingMode === 'sii') {
          void handleEmitToSii()
          return
        }
        setPendingEmitStage(stage)
        setEmitSiiOpen(true)
        return
      }

      applyStageChange(stage)
    },
    [applyStageChange, canEdit, handleEmitToSii, invoice, invoicingMode],
  )

  const handleInvoiceSaved = useCallback(
    async (updated: InvoiceDetail) => {
      if (invoice) {
        const result = handleInvoiceStatusStockChange(
          updated.id,
          updated.number,
          invoice.status,
          updated.status,
        )
        if (result.message) setStockMessage(result.message)
        if (!result.ok && result.message) {
          setInvoice(invoice)
          return
        }
      }
      saveInvoiceJourneyOverride(
        updated.id,
        updated.status as InvoiceJourneyStage,
        updated.siiNumber,
      )
      try {
        await updateInvoiceFromDetail(updated)
        setInvoice(updated)
      } catch {
        setStockMessage('No se pudo guardar la factura en el servidor.')
      }
    },
    [invoice, updateInvoiceFromDetail],
  )

  const handleFilesChange = useCallback(
    async (files: InvoiceDetail['files']) => {
      if (!invoice) return
      setInvoice((prev) => (prev ? { ...prev, files } : prev))
      try {
        const saved = await persistInvoiceFiles(invoice.id, invoice.number, files)
        setInvoice((prev) => (prev ? { ...prev, files: saved } : prev))
      } catch (error) {
        toast.error(
          apiActionErrorMessage(error, 'No se pudieron guardar los archivos.'),
        )
      }
    },
    [invoice],
  )

  const handleArchiveConfirm = useCallback(async () => {
    if (!invoiceId) return
    try {
      await archiveInvoice(invoiceId)
      setArchiveOpen(false)
      navigate('/facturacion')
      toast.success('Factura archivada.')
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar la factura.'),
      )
    }
  }, [archiveInvoice, invoiceId, navigate])

  const handleCreateAdjustment = useCallback(
    async (body: CreateInvoiceAdjustmentBody) => {
      if (!invoice || !canEdit) return
      if (!isApiEnabled()) {
        toast.warning('Los ajustes NC/ND requieren conexión al servidor.')
        return
      }
      try {
        const created =
          adjustmentKind === 'credit_note'
            ? await createCreditNoteApi(invoice.id, body)
            : await createDebitNoteApi(invoice.id, body)
        toast.success(
          `${adjustmentKind === 'credit_note' ? 'Nota de crédito' : 'Nota de débito'} «${created.number}» creada.`,
        )
        navigate(`/facturacion/${created.id}`)
      } catch (err) {
        toast.error(apiActionErrorMessage(err, 'No se pudo crear el documento de ajuste.'))
        throw err
      }
    },
    [adjustmentKind, canEdit, invoice, navigate],
  )

  if (loadState === 'loading') {
    return <RecordDetailLoading />
  }

  if (loadState === 'unavailable') {
    return (
      <RecordUnavailableView
        module="facturacion"
        reason={reason}
        detail={unavailableDetail}
        recordId={invoiceId}
      onRetry={reload}
      />
    )
  }

  if (!invoice) {
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
          <Link to="/facturacion">
            <ArrowLeft aria-hidden className="size-4" />
            Facturación
          </Link>
        </Button>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        <span className="truncate font-mono font-medium text-foreground">{invoice.number}</span>
      </nav>

      <InvoiceDetailHeader
        invoice={invoice}
        onStartEdit={canEdit ? () => setEditDialogOpen(true) : undefined}
        onRegisterActivity={openRegisterActivity}
        onArchive={canDelete ? () => setArchiveOpen(true) : undefined}
        onCreateCreditNote={
          canEdit && canCreateAdjustments(invoice)
            ? () => {
                setAdjustmentKind('credit_note')
                setAdjustmentOpen(true)
              }
            : undefined
        }
        onCreateDebitNote={
          canEdit && canCreateAdjustments(invoice)
            ? () => {
                setAdjustmentKind('debit_note')
                setAdjustmentOpen(true)
              }
            : undefined
        }
      />

      {canEdit ? (
        <CreateInvoiceAdjustmentDialog
          open={adjustmentOpen}
          onOpenChange={setAdjustmentOpen}
          kind={adjustmentKind}
          invoice={invoice}
          onSubmit={handleCreateAdjustment}
        />
      ) : null}

      <RegisterActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        relatedType="factura"
        contactId={invoice.id}
        contactName={invoice.number}
        companyName={invoice.client}
        defaultAuthor={invoice.owner}
        presetType={activityPresetType}
        onSaved={handleActivitySaved}
      />

      {stockMessage ? (
        <Card className="border-emerald-200 bg-emerald-50/80 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/40">
          <CardContent className="p-4 text-sm text-emerald-900 dark:text-emerald-100">
            {stockMessage}
          </CardContent>
        </Card>
      ) : null}

      {canEdit ? (
        <EditInvoiceDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          invoice={invoice}
          onSave={handleInvoiceSaved}
        />
      ) : null}

      <InvoiceEmitSiiDialog
        open={emitSiiOpen}
        onOpenChange={(open) => {
          setEmitSiiOpen(open)
          if (!open) setPendingEmitStage(null)
        }}
        invoiceNumber={invoice.number}
        initialSiiNumber={invoice.siiNumber ?? ''}
        onConfirm={(siiNumber) => {
          const stage = pendingEmitStage ?? INVOICE_EMITTED_STATUS
          applyStageChange(stage, siiNumber)
        }}
      />

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar factura</DialogTitle>
            <DialogDescription>
              «{invoice.number}» irá a Archivados (papelera) durante{' '}
              {INVOICE_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma definitiva si no
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

      <InvoiceSuccessPath
        invoiceId={invoice.id}
        currentStage={invoice.status}
        history={invoice.statusHistory}
        readOnly={!canEdit}
        onStageChange={canEdit ? handleStageChange : undefined}
      />

      <div className="min-w-0 space-y-4">
        <div
          className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Secciones de la factura"
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
                {id === 'actividad' && invoice.activities.length > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {invoice.activities.length}
                  </Badge>
                ) : null}
                {id === 'archivos' && invoice.files.length > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {invoice.files.length}
                  </Badge>
                ) : null}
              </button>
            ))}
        </div>

        {tab === 'detalle' ? (
          <div className="space-y-4">
            <InvoiceDetailSidebar invoice={invoice} />
              <InvoiceSiiFolioCard
                invoice={invoice}
                invoicingMode={invoicingMode}
                onEmitToSii={invoicingMode === 'sii' ? handleEmitToSii : undefined}
                emittingSii={emittingSii}
              />
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Descripción</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {invoice.description}
                  </p>
                </CardContent>
              </Card>
              <InvoiceLineItemsPanel lineItems={invoice.lineItems} />
              {invoice.relatedAdjustments?.length ? (
                <InvoiceRelatedAdjustmentsPanel adjustments={invoice.relatedAdjustments} />
              ) : null}
              {invoice.status === 'Pagada' && invoice.payments.length > 0 ? (
                <Card className="border-dashed shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Cobros</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      Los cobros se reflejan al marcar la factura como Pagada. En una integración
                      contable podrás registrar abonos parciales desde aquí.
                    </p>
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {invoice.payments.map((payment) => (
                        <li
                          key={payment.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                        >
                          <span>
                            {payment.amount} · {payment.date}
                          </span>
                          <Badge variant="customer">{payment.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}
            <RecordAuditMeta record={invoice} />
          </div>
        ) : null}

        {tab === 'actividad' ? (
          <EntityActivitiesSection
            activities={invoice.activities}
            entityKind="factura"
            onRegister={() => openRegisterActivity()}
          />
        ) : null}

        {tab === 'archivos' ? (
            <InvoiceFilesPanel
              authorName={invoice.owner}
              files={invoice.files}
              onFilesChange={handleFilesChange}
            />
          ) : null}

          {tab === 'notas' ? (
            <EntityNotesPanel
              notes={invoice.notes}
              authorName={invoice.owner}
              onAddNote={handleNoteAdded}
              onDeleteNote={handleNoteDeleted}
            />
          ) : null}
      </div>
    </PageScrollArea>
  )
}
