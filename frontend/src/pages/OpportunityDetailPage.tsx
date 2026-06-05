import {
  ArrowLeft,
  ChevronRight,
  FileSpreadsheet,
  FolderOpen,
  LayoutList,
  StickyNote,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ContactActivitiesPanel } from '@/components/contacts/ContactActivitiesPanel'
import { RegisterActivityDialog } from '@/components/contacts/RegisterActivityDialog'
import { EditOpportunityDialog } from '@/components/opportunities/EditOpportunityDialog'
import { OpportunityDetailHeader } from '@/components/opportunities/OpportunityDetailHeader'
import { OpportunityDetailSidebar } from '@/components/opportunities/OpportunityDetailSidebar'
import { OpportunityFilesPanel } from '@/components/opportunities/OpportunityFilesPanel'
import { OpportunityQuotesPanel } from '@/components/opportunities/OpportunityQuotesPanel'
import { OpportunitySuccessPath } from '@/components/opportunities/OpportunitySuccessPath'
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
import { useEntityNotes } from '@/hooks/use-entity-notes'
import type { OpportunityDetail } from '@/data/opportunity-detail.mock'
import {
  loadOpportunityDetail,
  loadQuotesForOpportunity,
  normalizeOpportunityDetail,
} from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { useCompaniesRegistry } from '@/hooks/use-companies-registry'
import { useContactsRegistry } from '@/hooks/use-contacts-registry'
import { useOpportunitiesRegistry } from '@/hooks/use-opportunities-registry'
import { useQuotesRegistry } from '@/hooks/use-quotes-registry'
import type { CreateQuoteFormValues } from '@/lib/quote-create'
import { quoteSummariesFromListItems } from '@/lib/quote-relations'
import { lastContactLabelFromActivity } from '@/lib/contact-activity'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import { persistOpportunityFiles } from '@/lib/opportunity-files'
import { OPPORTUNITY_ARCHIVE_RETENTION_DAYS } from '@/lib/opportunity-archive'
import {
  buildOpportunityStageHistoryOnTransition,
  canTransition,
  journeyStageToOutcome,
  type OpportunityJourneyStage,
} from '@/lib/opportunity-journey'
import { apiActionErrorMessage } from '@/api/errors'
import { syncOpportunityFromQuoteApi } from '@/api/opportunity-quote-sync'
import { isApiEnabled } from '@/api/config'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type DetailTab = 'detalle' | 'actividad' | 'cotizaciones' | 'notas' | 'archivos'

const tabs: { id: DetailTab; label: string; Icon: typeof Zap }[] = [
  { id: 'detalle', label: 'Detalle', Icon: LayoutList },
  { id: 'actividad', label: 'Actividad', Icon: Zap },
  { id: 'cotizaciones', label: 'Cotizaciones', Icon: FileSpreadsheet },
  { id: 'notas', label: 'Notas', Icon: StickyNote },
  { id: 'archivos', label: 'Archivos', Icon: FolderOpen },
]

export function OpportunityDetailPage() {
  const navigate = useNavigate()
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const { canEdit, canDelete } = useModulePermissions('oportunidades')
  const { archiveOpportunity, isArchived, updateOpportunityFromDetail } =
    useOpportunitiesRegistry()
  const { reloadFromApi: reloadCompanies } = useCompaniesRegistry()
  const { reloadFromApi: reloadContacts } = useContactsRegistry()
  const { addQuote } = useQuotesRegistry()

  useEffect(() => {
    void reloadCompanies().catch(() => {})
    void reloadContacts().catch(() => {})
  }, [reloadCompanies, reloadContacts])
  const [opportunity, setOpportunity] = useState<OpportunityDetail | null>(null)
  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: opportunityId,
    load: loadOpportunityDetail,
    isArchived,
    onLoaded: (id, record) => {
      setOpportunity(record)
      recordEntityView('oportunidades', id)
    },
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [tab, setTab] = useState<DetailTab>('detalle')
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [activityPresetType, setActivityPresetType] =
    useState<ContactActivityType>('llamada')
  const [syncQuoteId, setSyncQuoteId] = useState<string | null>(null)
  const useApi = isApiEnabled()

  const { onAddNote: handleNoteAdded, onDeleteNote: handleNoteDeleted } = useEntityNotes({
    scope: 'oportunidad',
    entityId: opportunityId,
    setRecord: setOpportunity,
    onAdded: () => setTab('notas'),
    onAfterChange: (next) => {
      updateOpportunityFromDetail(normalizeOpportunityDetail(next))
    },
  })

  const handleFilesChange = useCallback(
    async (files: OpportunityDetail['files']) => {
      if (!opportunity) return
      setOpportunity((prev) => (prev ? { ...prev, files } : prev))
      try {
        const saved = await persistOpportunityFiles(
          opportunity.id,
          opportunity.name,
          files,
        )
        setOpportunity((prev) => (prev ? { ...prev, files: saved } : prev))
      } catch (error) {
        toast.error(
          apiActionErrorMessage(error, 'No se pudieron guardar los archivos.'),
        )
      }
    },
    [opportunity],
  )

  const handleOpportunitySaved = useCallback(
    (updated: OpportunityDetail, linkedQuotes?: OpportunityDetail['quotes']) => {
      setOpportunity((prev) => {
        const quotes = linkedQuotes ?? updated.quotes ?? prev?.quotes
        const normalized = normalizeOpportunityDetail(
          {
            ...(prev ?? updated),
            ...updated,
            quotes,
            activities: updated.activities ?? prev?.activities ?? [],
            notes: updated.notes ?? prev?.notes ?? [],
            stageHistory: updated.stageHistory ?? prev?.stageHistory ?? [],
            lineItems:
              updated.lineItems !== undefined
                ? updated.lineItems
                : (prev?.lineItems ?? []),
            tags: updated.tags ?? prev?.tags ?? [],
          },
          quotes,
        )
        void updateOpportunityFromDetail(normalized)
        return normalized
      })
    },
    [updateOpportunityFromDetail],
  )

  const handleArchiveConfirm = useCallback(async () => {
    if (!opportunityId) return
    try {
      await archiveOpportunity(opportunityId)
      setArchiveOpen(false)
      navigate('/oportunidades')
      toast.success('Oportunidad archivada.')
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar la oportunidad.'),
      )
    }
  }, [archiveOpportunity, opportunityId, navigate])

  const openRegisterActivity = useCallback(
    (presetType: ContactActivityType = 'llamada') => {
      setActivityPresetType(presetType)
      setActivityDialogOpen(true)
    },
    [],
  )

  const handleSyncQuote = useCallback(
    async (quoteId: string) => {
      if (!opportunityId || !useApi) return
      setSyncQuoteId(quoteId)
      try {
        const [updated, linkedQuotes] = await Promise.all([
          syncOpportunityFromQuoteApi(opportunityId, quoteId),
          loadQuotesForOpportunity(opportunityId),
        ])
        handleOpportunitySaved(updated, linkedQuotes)
        toast.success(
          'Oportunidad sincronizada con la cotización (monto con IVA y líneas).',
        )
      } catch (error) {
        toast.error(
          apiActionErrorMessage(error, 'No se pudo sincronizar la cotización.'),
        )
      } finally {
        setSyncQuoteId(null)
      }
    },
    [opportunityId, useApi, handleOpportunitySaved],
  )

  const handleCreateQuote = useCallback(
    async (values: CreateQuoteFormValues) => {
      const item = await addQuote(values)
      const summary = quoteSummariesFromListItems([item])[0]
      if (summary) {
        setOpportunity((prev) => {
          if (!prev) return prev
          const rest = prev.quotes.filter((q) => q.id !== summary.id)
          return {
            ...prev,
            quotes: [summary, ...rest],
            quoteCount: rest.length + 1,
          }
        })
      }
      navigate(`/cotizaciones/${item.id}`)
    },
    [addQuote, navigate],
  )

  const handleActivitySaved = useCallback((activity: ContactActivity) => {
    setOpportunity((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        activities: [activity, ...prev.activities],
        lastActivity: lastContactLabelFromActivity(activity),
      }
    })
    setTab('actividad')
  }, [])

  if (loadState === 'loading') {
    return <RecordDetailLoading />
  }

  if (loadState === 'unavailable') {
    return (
      <RecordUnavailableView
        module="oportunidades"
        reason={reason}
        detail={unavailableDetail}
        recordId={opportunityId}
      onRetry={reload}
      />
    )
  }

  if (!opportunity) {
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
          <Link to="/oportunidades">
            <ArrowLeft aria-hidden className="size-4" />
            Oportunidades
          </Link>
        </Button>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        <span className="truncate font-medium text-foreground">{opportunity.name}</span>
      </nav>

      <OpportunityDetailHeader
        opportunity={opportunity}
        onStartEdit={canEdit ? () => setEditDialogOpen(true) : undefined}
        onRegisterActivity={openRegisterActivity}
        onArchive={canDelete ? () => setArchiveOpen(true) : undefined}
      />

      {canEdit ? (
        <EditOpportunityDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          opportunity={opportunity}
          onSave={handleOpportunitySaved}
        />
      ) : null}

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar oportunidad</DialogTitle>
            <DialogDescription>
              «{opportunity.name}» irá a Archivados (papelera) durante{' '}
              {OPPORTUNITY_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma
              definitiva si no la restauras.
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
        relatedType="oportunidad"
        contactId={opportunity.id}
        contactName={opportunity.name}
        companyName={opportunity.company}
        defaultAuthor={opportunity.owner}
        presetType={activityPresetType}
        onSaved={handleActivitySaved}
      />

      <OpportunitySuccessPath
        currentStage={opportunity.stage}
        history={opportunity.stageHistory}
        readOnly={!canEdit}
        onStageChange={
          canEdit
            ? (stage: OpportunityJourneyStage) => {
                if (
                  !canTransition(opportunity.stage, stage, {
                    history: opportunity.stageHistory,
                  })
                ) {
                  return
                }
                const outcome = journeyStageToOutcome(stage, opportunity.lossReason)
                const nextOpportunity = normalizeOpportunityDetail({
                  ...opportunity,
                  stage,
                  outcome,
                  stageHistory: buildOpportunityStageHistoryOnTransition(
                    opportunity.stage,
                    stage,
                    opportunity.stageHistory ?? [],
                  ),
                })
                void updateOpportunityFromDetail(nextOpportunity)
                setOpportunity(nextOpportunity)
              }
            : undefined
        }
      />

      <div className="min-w-0 space-y-4">
        <div
          className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Secciones de la oportunidad"
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
                {id === 'cotizaciones' && opportunity.quoteCount > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {opportunity.quoteCount}
                  </Badge>
                ) : null}
              </button>
            ))}
        </div>

        {tab === 'detalle' ? (
          <div className="space-y-4">
            <OpportunityDetailSidebar opportunity={opportunity} />
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Descripción</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {opportunity.description}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">
                    Líneas de producto / servicio
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {opportunity.lineItems.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-muted-foreground">
                      Esta oportunidad no tiene líneas de producto o servicio.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                            <th className="px-4 py-2 font-medium">Producto</th>
                            <th className="px-4 py-2 font-medium">Cant.</th>
                            <th className="px-4 py-2 font-medium">Precio unit.</th>
                            <th className="px-4 py-2 font-medium">Desc.</th>
                            <th className="px-4 py-2 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {opportunity.lineItems.map((li) => (
                            <tr key={li.id} className="border-b border-border last:border-0">
                              <td className="px-4 py-3 font-medium">{li.product}</td>
                              <td className="px-4 py-3 tabular-nums">{li.quantity}</td>
                              <td className="px-4 py-3 tabular-nums">{li.unitPrice}</td>
                              <td className="px-4 py-3">{li.discount}</td>
                              <td className="px-4 py-3 font-semibold tabular-nums">{li.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            <RecordAuditMeta record={opportunity} />
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
                  activities={opportunity.activities}
                  entityKind="oportunidad"
                  onRegister={() => openRegisterActivity()}
                />
              </CardContent>
            </Card>
          ) : null}

          {tab === 'cotizaciones' ? (
            <OpportunityQuotesPanel
              quotes={opportunity.quotes}
              opportunity={opportunity}
              primaryQuoteId={opportunity.primaryQuoteId}
              onCreateQuote={handleCreateQuote}
              onSyncQuote={useApi && canEdit ? handleSyncQuote : undefined}
              syncLoadingQuoteId={syncQuoteId}
            />
          ) : null}

          {tab === 'notas' ? (
            <EntityNotesPanel
              notes={opportunity.notes}
              authorName={opportunity.owner}
              onAddNote={handleNoteAdded}
              onDeleteNote={handleNoteDeleted}
            />
          ) : null}

          {tab === 'archivos' ? (
            <OpportunityFilesPanel
              authorName={opportunity.owner}
              files={opportunity.files}
              onFilesChange={handleFilesChange}
            />
          ) : null}
      </div>
    </PageScrollArea>
  )
}
