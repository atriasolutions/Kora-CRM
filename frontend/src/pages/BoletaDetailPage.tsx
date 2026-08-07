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

import { EditBoletaDialog } from '@/components/boletas/EditBoletaDialog'
import { BoletaDetailHeader } from '@/components/boletas/BoletaDetailHeader'
import { BoletaDetailSidebar } from '@/components/boletas/BoletaDetailSidebar'
import { BoletaLineItemsPanel } from '@/components/boletas/BoletaLineItemsPanel'
import { BoletaFilesPanel } from '@/components/boletas/BoletaFilesPanel'
import { BoletaSuccessPath } from '@/components/boletas/BoletaSuccessPath'
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
import type { BoletaDetail } from '@/data/boleta-detail.mock'
import { loadBoletaDetail } from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useBoletasRegistry } from '@/hooks/use-boletas-registry'
import { useEntityNotes } from '@/hooks/use-entity-notes'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import { BOLETA_ARCHIVE_RETENTION_DAYS } from '@/lib/boleta-archive'
import { persistBoletaFiles, type BoletaFile } from '@/lib/boleta-files'
import {
  buildBoletaJourneyHistoryOnTransition,
  canBoletaTransition,
  saveBoletaJourneyOverride,
  type BoletaJourneyStage,
} from '@/lib/boleta-journey'
import { apiActionErrorMessage } from '@/api/errors'
import { handleBoletaStatusStockChange } from '@/lib/stock-service'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useOrganizationSettings } from '@/hooks/use-organization-settings'
import {
  downloadAndPrintBoletaThermalPdf,
} from '@/lib/boleta-thermal-pdf'
import { isApiEnabled } from '@/api/config'
import { markBoletaPrintedApi } from '@/api/boletas'

type DetailTab = 'detalle' | 'actividad' | 'archivos' | 'notas'

const tabs: { id: DetailTab; label: string; Icon: typeof LayoutList }[] = [
  { id: 'detalle', label: 'Detalle', Icon: LayoutList },
  { id: 'actividad', label: 'Actividad', Icon: Zap },
  { id: 'archivos', label: 'Archivos', Icon: FolderOpen },
  { id: 'notas', label: 'Notas', Icon: StickyNote },
]

export function BoletaDetailPage() {
  const navigate = useNavigate()
  const { boletaId } = useParams<{ boletaId: string }>()
  const { canEdit, canDelete } = useModulePermissions('boletas')
  const { settings: orgSettings } = useOrganizationSettings()
  const { archiveBoleta, isArchived, patchBoletaStatus, updateBoletaFromDetail } =
    useBoletasRegistry()
  const [boleta, setBoleta] = useState<BoletaDetail | null>(null)
  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: boletaId,
    load: loadBoletaDetail,
    isArchived,
    onLoaded: (id, record) => {
      setBoleta(record)
      recordEntityView('boletas', id)
    },
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [tab, setTab] = useState<DetailTab>('detalle')
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [activityPresetType, setActivityPresetType] =
    useState<ContactActivityType>('llamada')
  const [stockMessage, setStockMessage] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)

  const handlePrintComprobante = useCallback(async () => {
    if (!boleta) return
    setPrinting(true)
    try {
      const { printed } = await downloadAndPrintBoletaThermalPdf(boleta, orgSettings)
      if (isApiEnabled()) {
        try {
          await markBoletaPrintedApi(boleta.id)
        } catch {
          /* marcar impreso es secundario */
        }
      }
      if (printed) {
        toast.success('Comprobante descargado. Se abrió la ventana de impresión.')
      } else {
        toast.success(
          'Comprobante descargado. Permite ventanas emergentes para imprimir desde el PDF.',
        )
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'No se pudo generar el comprobante térmico.'
      toast.error(message)
    } finally {
      setPrinting(false)
    }
  }, [boleta, orgSettings])

  const openRegisterActivity = useCallback(
    (presetType: ContactActivityType = 'llamada') => {
      setActivityPresetType(presetType)
      setActivityDialogOpen(true)
    },
    [],
  )

  const handleActivitySaved = useCallback((activity: ContactActivity) => {
    setBoleta((prev) => {
      if (!prev) return prev
      const next = { ...prev, activities: [activity, ...prev.activities] }
      updateBoletaFromDetail(next)
      return next
    })
    setTab('actividad')
  }, [updateBoletaFromDetail])

  const { onAddNote: handleNoteAdded, onDeleteNote: handleNoteDeleted } = useEntityNotes({
    scope: 'boleta',
    entityId: boletaId,
    setRecord: setBoleta,
    onAdded: () => setTab('notas'),
    onAfterChange: (next) => {
      updateBoletaFromDetail(next)
    },
  })

  const applyStageChange = useCallback(
    async (stage: BoletaJourneyStage) => {
      if (!boleta) return
      const previousStatus = boleta.status
      const nextBoleta: BoletaDetail = {
        ...boleta,
        status: stage,
        statusHistory: buildBoletaJourneyHistoryOnTransition(
          boleta.status,
          stage,
          boleta.statusHistory,
        ),
      }

      try {
        const updated = await patchBoletaStatus(boleta.id, stage)
        if (!isApiEnabled()) {
          saveBoletaJourneyOverride(boleta.id, stage)
          const result = handleBoletaStatusStockChange(
            boleta.id,
            boleta.number,
            previousStatus,
            stage,
          )
          if (result.message) setStockMessage(result.message)
        }
        setBoleta({
          ...boleta,
          ...updated,
          status: stage,
          statusHistory: nextBoleta.statusHistory,
        })
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
    [boleta, patchBoletaStatus],
  )

  const handleStageChange = useCallback(
    (stage: BoletaJourneyStage) => {
      if (!boleta || !canEdit) return
      if (!canBoletaTransition(boleta.status, stage)) return
      void applyStageChange(stage)
    },
    [applyStageChange, boleta, canEdit],
  )

  const handleBoletaSaved = useCallback(
    async (updated: BoletaDetail) => {
      if (boleta) {
        const result = handleBoletaStatusStockChange(
          updated.id,
          updated.number,
          boleta.status,
          updated.status,
        )
        if (result.message) setStockMessage(result.message)
        if (!result.ok && result.message) {
          setBoleta(boleta)
          return
        }
      }
      saveBoletaJourneyOverride(updated.id, updated.status)
      try {
        await updateBoletaFromDetail(updated)
        setBoleta(updated)
      } catch {
        setStockMessage('No se pudo guardar la boleta en el servidor.')
      }
    },
    [boleta, updateBoletaFromDetail],
  )

  const handleFilesChange = useCallback(
    async (files: BoletaFile[]) => {
      if (!boleta) return
      setBoleta((prev) => (prev ? { ...prev, files } : prev))
      try {
        const saved = await persistBoletaFiles(boleta.id, boleta.number, files)
        setBoleta((prev) => (prev ? { ...prev, files: saved } : prev))
      } catch (error) {
        toast.error(apiActionErrorMessage(error, 'No se pudieron guardar los archivos.'))
      }
    },
    [boleta],
  )

  const handleArchiveConfirm = useCallback(async () => {
    if (!boletaId) return
    try {
      await archiveBoleta(boletaId)
      setArchiveOpen(false)
      navigate('/boletas')
      toast.success('Boleta archivada.')
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo archivar la boleta.'))
    }
  }, [archiveBoleta, boletaId, navigate])

  if (loadState === 'loading') {
    return <RecordDetailLoading />
  }

  if (loadState === 'unavailable') {
    return (
      <RecordUnavailableView
        module="boletas"
        reason={reason}
        detail={unavailableDetail}
        recordId={boletaId}
        onRetry={reload}
      />
    )
  }

  if (!boleta) {
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
          <Link to="/boletas">
            <ArrowLeft aria-hidden className="size-4" />
            Boletas
          </Link>
        </Button>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        <span className="truncate font-mono font-medium text-foreground">{boleta.number}</span>
      </nav>

      <BoletaDetailHeader
        boleta={boleta}
        onStartEdit={canEdit ? () => setEditDialogOpen(true) : undefined}
        onRegisterActivity={openRegisterActivity}
        onArchive={canDelete ? () => setArchiveOpen(true) : undefined}
        onPrint={handlePrintComprobante}
        printing={printing}
      />

      {canEdit ? (
        <EditBoletaDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          boleta={boleta}
          onSave={handleBoletaSaved}
        />
      ) : null}

      <RegisterActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        relatedType="boleta"
        contactId={boleta.id}
        contactName={boleta.number}
        companyName={boleta.buyerName}
        defaultAuthor={boleta.owner}
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

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar boleta</DialogTitle>
            <DialogDescription>
              «{boleta.number}» irá a Archivados durante {BOLETA_ARCHIVE_RETENTION_DAYS} días.
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

      <BoletaSuccessPath
        currentStage={boleta.status}
        history={boleta.statusHistory}
        readOnly={!canEdit}
        onStageChange={canEdit ? handleStageChange : undefined}
      />

      <div className="min-w-0 space-y-4">
        <div
          className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Secciones de la boleta"
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
              {id === 'actividad' && boleta.activities.length > 0 ? (
                <Badge variant="secondary" className="ms-0.5 font-normal">
                  {boleta.activities.length}
                </Badge>
              ) : null}
              {id === 'archivos' && boleta.files.length > 0 ? (
                <Badge variant="secondary" className="ms-0.5 font-normal">
                  {boleta.files.length}
                </Badge>
              ) : null}
            </button>
          ))}
        </div>

        {tab === 'detalle' ? (
          <div className="space-y-4">
            <BoletaDetailSidebar boleta={boleta} />
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Descripción</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {boleta.description}
                </p>
              </CardContent>
            </Card>
            <BoletaLineItemsPanel lineItems={boleta.lineItems} />
            <RecordAuditMeta record={boleta} />
          </div>
        ) : null}

        {tab === 'actividad' ? (
          <EntityActivitiesSection
            entityKind="boleta"
            activities={boleta.activities}
            onRegister={canEdit ? () => openRegisterActivity() : undefined}
          />
        ) : null}

        {tab === 'archivos' ? (
          <BoletaFilesPanel
            authorName={boleta.owner}
            files={boleta.files}
            disabled={!canEdit}
            onFilesChange={handleFilesChange}
          />
        ) : null}

        {tab === 'notas' ? (
          <EntityNotesPanel
            notes={boleta.notes}
            authorName={boleta.owner}
            disabled={!canEdit}
            onAddNote={handleNoteAdded}
            onDeleteNote={handleNoteDeleted}
          />
        ) : null}
      </div>
    </PageScrollArea>
  )
}
