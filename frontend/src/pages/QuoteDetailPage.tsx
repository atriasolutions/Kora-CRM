import {
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  History,
  LayoutList,
  Receipt,
  StickyNote,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ContactActivitiesPanel } from '@/components/contacts/ContactActivitiesPanel'
import { RegisterActivityDialog } from '@/components/contacts/RegisterActivityDialog'
import { CreateInvoiceDialog } from '@/components/invoices/CreateInvoiceDialog'
import { EditQuoteDialog } from '@/components/quotes/EditQuoteDialog'
import { QuoteDetailHeader } from '@/components/quotes/QuoteDetailHeader'
import { QuoteFilesPanel } from '@/components/quotes/QuoteFilesPanel'
import { QuoteInvoicesPanel } from '@/components/quotes/QuoteInvoicesPanel'
import { QuoteDetailSidebar } from '@/components/quotes/QuoteDetailSidebar'
import { QuotePdfPreviewDialog } from '@/components/quotes/QuotePdfPreviewDialog'
import { QuoteLineItemsPanel } from '@/components/quotes/QuoteLineItemsPanel'
import { QuoteStockBanner } from '@/components/quotes/QuoteStockBanner'
import { QuoteSuccessPath } from '@/components/quotes/QuoteSuccessPath'
import { EntityNotesPanel } from '@/components/shared/EntityNotesPanel'
import { RecordAuditMeta } from '@/components/shared/RecordAuditMeta'
import { QuoteTotalsSummary } from '@/components/quotes/QuoteTotalsSummary'
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
import { apiActionErrorMessage } from '@/api/errors'
import { ensureQuoteStockReservationApi } from '@/api/quotes'
import { syncOpportunityFromQuoteApi } from '@/api/opportunity-quote-sync'
import { isApiEnabled } from '@/api/config'
import type { QuoteDetail } from '@/data/quote-detail.mock'
import { loadQuoteDetail } from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { useEntityNotes } from '@/hooks/use-entity-notes'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useInvoicesRegistry } from '@/hooks/use-invoices-registry'
import { useQuotesRegistry } from '@/hooks/use-quotes-registry'
import { useStockSync } from '@/hooks/use-stock-sync'
import {
  invoiceFormValuesFromQuote,
  type CreateInvoiceFormValues,
} from '@/lib/invoice-create'
import { invoiceSummariesForQuote } from '@/lib/invoice-relations'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import { QUOTE_ARCHIVE_RETENTION_DAYS } from '@/lib/quote-archive'
import {
  buildQuoteJourneyHistoryOnTransition,
  canTransition,
  type QuoteJourneyStage,
} from '@/lib/quote-journey'
import { quoteStatusVariant } from '@/lib/quote-display'
import {
  releaseStockForQuote,
  quoteHasActiveReservation,
  reserveStockForQuote,
  shouldReleaseQuoteReservation,
  shouldReserveQuoteOnStatus,
  transferQuoteReservationToInvoice,
} from '@/lib/stock-service'
import { INVENTORY_REGISTRY_SYNC_EVENT } from '@/lib/product-inventory-sync'
import { persistQuoteFiles } from '@/lib/quote-files'
import { toast } from '@/lib/toast'
import type { ContactActivity, ContactActivityType } from '@/data/contact-detail.mock'
import { DetailPageTabs, detailPageTabClassName } from '@/components/shared/DetailPageTabs'

const useApi = isApiEnabled()

function refreshInventoryFromServer() {
  window.dispatchEvent(new Event(INVENTORY_REGISTRY_SYNC_EVENT))
}

type DetailTab =
  | 'detalle'
  | 'actividad'
  | 'facturas'
  | 'historial'
  | 'notas'
  | 'archivos'

const tabs: { id: DetailTab; label: string; Icon: typeof Zap }[] = [
  { id: 'detalle', label: 'Detalle', Icon: LayoutList },
  { id: 'actividad', label: 'Actividad', Icon: Zap },
  { id: 'facturas', label: 'Facturas', Icon: Receipt },
  { id: 'historial', label: 'Historial', Icon: History },
  { id: 'notas', label: 'Notas', Icon: StickyNote },
  { id: 'archivos', label: 'Archivos', Icon: FolderOpen },
]

export function QuoteDetailPage() {
  const navigate = useNavigate()
  const { quoteId } = useParams<{ quoteId: string }>()
  const { canEdit, canDelete } = useModulePermissions('cotizaciones')
  const { canEdit: canEditOpportunity } = useModulePermissions('oportunidades')
  const { archiveQuote, isArchived, updateQuoteFromDetail } = useQuotesRegistry()
  const { addInvoice, allInvoices } = useInvoicesRegistry()
  const stockVersion = useStockSync()
  const [quote, setQuote] = useState<QuoteDetail | null>(null)
  const [syncOppLoading, setSyncOppLoading] = useState(false)
  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: quoteId,
    load: loadQuoteDetail,
    isArchived,
    onLoaded: (id, record) => {
      setQuote(record)
      recordEntityView('cotizaciones', id)
    },
    deps: [stockVersion],
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [tab, setTab] = useState<DetailTab>('detalle')
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [activityPresetType, setActivityPresetType] =
    useState<ContactActivityType>('llamada')
  const [stockMessage, setStockMessage] = useState<string | null>(null)

  const { onAddNote: handleNoteAdded, onDeleteNote: handleNoteDeleted } = useEntityNotes({
    scope: 'cotizacion',
    entityId: quoteId,
    setRecord: setQuote,
    onAdded: () => setTab('notas'),
    onAfterChange: (next) => {
      void updateQuoteFromDetail(next)
    },
  })

  const handleFilesChange = useCallback(
    async (files: QuoteDetail['files']) => {
      if (!quote) return
      setQuote((prev) => (prev ? { ...prev, files } : prev))
      try {
        const saved = await persistQuoteFiles(quote.id, quote.code, files)
        setQuote((prev) => (prev ? { ...prev, files: saved } : prev))
      } catch (error) {
        toast.error(
          apiActionErrorMessage(error, 'No se pudieron guardar los archivos.'),
        )
      }
    },
    [quote],
  )

  const openRegisterActivity = useCallback((presetType: ContactActivityType = 'llamada') => {
    setActivityPresetType(presetType)
    setActivityDialogOpen(true)
  }, [])

  const handleQuoteSaved = useCallback(
    async (updated: QuoteDetail) => {
      try {
        const persisted = await updateQuoteFromDetail(updated)
        setQuote(persisted)
        toast.success('Cotización actualizada.')
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo guardar la cotización.'
        toast.error(message)
      }
    },
    [updateQuoteFromDetail],
  )

  const linkedInvoices = useMemo(
    () => (quote ? invoiceSummariesForQuote(quote.id) : []),
    [quote, allInvoices],
  )

  const handleCreateInvoice = useCallback(
    async (values: CreateInvoiceFormValues) => {
      try {
        const item = await addInvoice(values)
        if (values.quoteId) {
          const transfer = transferQuoteReservationToInvoice(
            values.quoteId,
            item.id,
            item.number,
          )
          if (transfer.message) setStockMessage(transfer.message)
        }
        setTab('facturas')
        navigate(`/facturacion/${item.id}`)
      } catch {
        setStockMessage('No se pudo crear la factura.')
      }
    },
    [addInvoice, navigate],
  )

  const handleSyncOpportunity = useCallback(async () => {
    if (!quote?.opportunityId?.trim() || !quoteId || !useApi) return
    setSyncOppLoading(true)
    try {
      await syncOpportunityFromQuoteApi(quote.opportunityId.trim(), quoteId)
      toast.success(
        'Oportunidad sincronizada con esta cotización (monto con IVA y líneas).',
      )
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo sincronizar con la oportunidad.'),
      )
    } finally {
      setSyncOppLoading(false)
    }
  }, [quote?.opportunityId, quoteId, useApi])

  const handleArchiveConfirm = useCallback(async () => {
    if (!quoteId) return
    try {
      await archiveQuote(quoteId)
      setArchiveOpen(false)
      navigate('/cotizaciones')
      toast.success('Cotización archivada.')
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar la cotización.'),
      )
    }
  }, [archiveQuote, quoteId, navigate])

  const handleActivitySaved = useCallback((activity: ContactActivity) => {
    setQuote((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        activities: [activity, ...prev.activities],
      }
    })
    setTab('actividad')
  }, [])

  useEffect(() => {
    if (!quote || quote.status !== 'Aceptada') return
    let cancelled = false

    const syncStock = async () => {
      if (useApi) {
        try {
          await ensureQuoteStockReservationApi(quote.id)
          if (!cancelled) refreshInventoryFromServer()
        } catch (err) {
          if (!cancelled) {
            const message =
              err instanceof Error ? err.message : 'No se pudo reservar stock para la cotización.'
            setStockMessage(message)
          }
        }
        return
      }

      if (quoteHasActiveReservation(quote.id)) return
      const result = reserveStockForQuote(
        quote.id,
        quote.code,
        quote.lineItems.map((li) => ({
          id: li.id,
          sku: li.sku,
          productId: li.productId,
          quantity: li.quantity,
        })),
      )
      if (!cancelled) {
        setStockMessage(
          result.ok
            ? result.message ?? 'Stock reservado.'
            : result.message ?? 'No se pudo reservar stock.',
        )
      }
    }

    void syncStock()
    return () => {
      cancelled = true
    }
  }, [quote?.id, quote?.status])

  if (loadState === 'loading') {
    return <RecordDetailLoading />
  }

  if (loadState === 'unavailable') {
    return (
      <RecordUnavailableView
        module="cotizaciones"
        reason={reason}
        detail={unavailableDetail}
        recordId={quoteId}
      onRetry={reload}
      />
    )
  }

  if (!quote) {
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
          <Link to="/cotizaciones">
            <ArrowLeft aria-hidden className="size-4" />
            Cotizaciones
          </Link>
        </Button>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        <span className="truncate font-mono font-medium text-foreground">{quote.code}</span>
      </nav>

      <QuoteDetailHeader
        quote={quote}
        invoiceCount={linkedInvoices.length}
        onStartEdit={canEdit ? () => setEditDialogOpen(true) : undefined}
        onArchive={canDelete ? () => setArchiveOpen(true) : undefined}
        onPdfPreview={() => setPdfOpen(true)}
        onCreateInvoice={() => setInvoiceDialogOpen(true)}
        onSyncOpportunity={
          useApi && canEditOpportunity && quote.opportunityId?.trim()
            ? handleSyncOpportunity
            : undefined
        }
        syncOpportunityLoading={syncOppLoading}
      />

      {canEdit ? (
        <EditQuoteDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          quote={quote}
          onSave={handleQuoteSaved}
        />
      ) : null}

      <QuotePdfPreviewDialog quote={quote} open={pdfOpen} onOpenChange={setPdfOpen} />

      <CreateInvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        title="Generar factura"
        description={`Desde la cotización «${quote.code}» para ${quote.companyName}.`}
        initialValues={invoiceFormValuesFromQuote(quote)}
        onSubmit={handleCreateInvoice}
      />

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar cotización</DialogTitle>
            <DialogDescription>
              «{quote.code}» irá a Archivados durante {QUOTE_ARCHIVE_RETENTION_DAYS} días.
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
        relatedType="cotizacion"
        contactId={quote.id}
        contactName={quote.code}
        companyName={quote.companyName}
        defaultAuthor={quote.owner}
        presetType={activityPresetType}
        onSaved={handleActivitySaved}
      />

      <QuoteSuccessPath
        currentStage={quote.status}
        history={quote.statusHistory}
        readOnly={!canEdit}
        onStageChange={
          canEdit
            ? (stage: QuoteJourneyStage) => {
          if (
            !canTransition(quote.status, stage, {
              history: quote.statusHistory,
            })
          ) {
            return
          }

          const previousStatus = quote.status
          const nextQuote = {
            ...quote,
            status: stage,
            statusHistory: buildQuoteJourneyHistoryOnTransition(
              quote.status,
              stage,
              quote.statusHistory,
            ),
          }

          void (async () => {
            if (!useApi) {
              if (shouldReserveQuoteOnStatus(stage)) {
                const result = reserveStockForQuote(
                  quote.id,
                  quote.code,
                  quote.lineItems.map((li) => ({
                    id: li.id,
                    sku: li.sku,
                    productId: li.productId,
                    quantity: li.quantity,
                  })),
                )
                setStockMessage(
                  result.ok
                    ? result.message ?? 'Stock reservado.'
                    : result.message ?? 'No se pudo reservar stock.',
                )
                if (!result.ok) return
              } else if (shouldReleaseQuoteReservation(previousStatus, stage)) {
                const result = releaseStockForQuote(
                  quote.id,
                  `COT ${quote.code} → ${stage}`,
                )
                if (result.message) setStockMessage(result.message)
              }
            }

            try {
              await updateQuoteFromDetail(nextQuote)
              setQuote(nextQuote)
              if (useApi) {
                refreshInventoryFromServer()
                if (shouldReserveQuoteOnStatus(stage)) {
                  setStockMessage('Stock reservado para la cotización aceptada.')
                } else if (shouldReleaseQuoteReservation(previousStatus, stage)) {
                  setStockMessage('Reserva de stock liberada.')
                }
              }
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : 'No se pudo actualizar la cotización ni reservar stock.'
              toast.error(message)
            }
          })()
            }
            : undefined
        }
      />

      <div className="min-w-0 space-y-4">
        <DetailPageTabs aria-label="Secciones de la cotización">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={detailPageTabClassName(tab === id)}
              >
                <Icon aria-hidden className="size-4 opacity-70" />
                <span className="whitespace-nowrap">{label}</span>
              </button>
            ))}
        </DetailPageTabs>

        {tab === 'detalle' ? (
          <div className="space-y-4">
            <QuoteDetailSidebar quote={quote} />
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Descripción</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {quote.description}
                  </p>
                </CardContent>
              </Card>
              <QuoteStockBanner
                key={stockVersion}
                quoteId={quote.id}
                quoteStatus={quote.status}
                stockMessage={stockMessage}
              />
              <QuoteLineItemsPanel
                lineItems={quote.lineItems}
                showAvailability
              />
              <QuoteTotalsSummary quote={quote} />
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Términos comerciales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Pago: </span>
                    {quote.paymentTerms?.trim() || '—'}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Entrega: </span>
                    {quote.deliveryTerms?.trim() || '—'}
                  </p>
                  {quote.terms?.trim() ? (
                    <p className="leading-relaxed whitespace-pre-wrap">{quote.terms}</p>
                  ) : (
                    <p className="italic">Sin términos adicionales.</p>
                  )}
                </CardContent>
              </Card>
            <RecordAuditMeta record={quote} />
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
                  activities={quote.activities}
                  entityKind="cotizacion"
                  onRegister={() => openRegisterActivity()}
                />
              </CardContent>
            </Card>
          ) : null}

          {tab === 'facturas' ? (
            <QuoteInvoicesPanel
              invoices={linkedInvoices}
              quote={quote}
              onOpenCreate={() => setInvoiceDialogOpen(true)}
            />
          ) : null}

          {tab === 'historial' ? (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Historial de estados</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {quote.statusHistory.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-4 py-3"
                    >
                      <Badge variant={quoteStatusVariant(entry.status)}>{entry.status}</Badge>
                      <span className="text-sm text-muted-foreground">{entry.at}</span>
                      {entry.note ? (
                        <p className="w-full text-xs text-muted-foreground">{entry.note}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {tab === 'notas' ? (
            <EntityNotesPanel
              notes={quote.notes}
              authorName={quote.owner}
              onAddNote={handleNoteAdded}
              onDeleteNote={handleNoteDeleted}
            />
          ) : null}

          {tab === 'archivos' ? (
            <QuoteFilesPanel
              authorName={quote.owner}
              files={quote.files}
              onFilesChange={handleFilesChange}
            />
          ) : null}
      </div>
    </PageScrollArea>
  )
}
