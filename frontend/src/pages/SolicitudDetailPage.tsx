import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  FolderOpen,
  LayoutList,
  Pencil,
  Puzzle,
  StickyNote,
  Trash2,
  Users,
  Zap,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { EditSolicitudDialog } from '@/components/solicitudes/EditSolicitudDialog'
import { SolicitudDescriptionContent } from '@/components/solicitudes/SolicitudDescriptionContent'
import { SolicitudFilesPanel } from '@/components/solicitudes/SolicitudFilesPanel'
import { SolicitudProjectsPanel } from '@/components/solicitudes/SolicitudProjectsPanel'
import { SolicitudSuccessPath } from '@/components/solicitudes/SolicitudSuccessPath'
import { SolicitudTeamMembersPanel } from '@/components/solicitudes/SolicitudTeamMembersPanel'
import { RegisterActivityDialog } from '@/components/contacts/RegisterActivityDialog'
import { EntityActivitiesSection } from '@/components/shared/EntityActivitiesSection'
import { EntityNotesPanel } from '@/components/shared/EntityNotesPanel'
import { Badge } from '@/components/ui/badge'
import { RecordAuditMeta } from '@/components/shared/RecordAuditMeta'
import type { SolicitudTeamMember } from '@/data/solicitudes.mock'
import type { ContactActivity, ContactActivityType } from '@/data/contact-detail.mock'
import type { SolicitudDetail } from '@/data/solicitudes.mock'
import { loadSolicitudDetail } from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { useSolicitudesRegistry } from '@/hooks/use-solicitudes-registry'
import { useEntityNotes } from '@/hooks/use-entity-notes'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import { SOLICITUD_ARCHIVE_RETENTION_DAYS } from '@/lib/solicitud-archive'
import { persistSolicitudFiles } from '@/lib/solicitud-files'
import {
  collectNewTeamMembersFromLists,
  dedupeSolicitudTeamMembers,
} from '@/lib/solicitud-team-access'
import {
  solicitudPriorityVariant,
  solicitudStatusVariant,
} from '@/lib/solicitud-display'
import { apiActionErrorMessage } from '@/api/errors'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import {
  buildSolicitudStatusHistoryOnTransition,
  canTransition,
  type SolicitudJourneyStage,
} from '@/lib/solicitud-journey'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
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

type DetailTab = 'detalle' | 'equipo' | 'notas' | 'archivos' | 'actividad' | 'proyectos'

const tabs: { id: DetailTab; label: string; Icon: typeof LayoutList }[] = [
  { id: 'detalle', label: 'Detalle', Icon: LayoutList },
  { id: 'equipo', label: 'Equipo', Icon: Users },
  { id: 'notas', label: 'Notas', Icon: StickyNote },
  { id: 'proyectos', label: 'Proyectos', Icon: Puzzle },
  { id: 'archivos', label: 'Archivos', Icon: FolderOpen },
  { id: 'actividad', label: 'Actividad', Icon: Zap },
]

export function SolicitudDetailPage() {
  const navigate = useNavigate()
  const { solicitudId } = useParams<{ solicitudId: string }>()
  const { canEdit, canDelete } = useModulePermissions('solicitudes')
  const { canView: canViewProjects, canCreate: canCreateProject } =
    useModulePermissions('proyectos')
  const { canCreate: canCreateActivity } = useModulePermissions('actividades')
  const canRegisterActivity = canCreateActivity || canEdit
  const { archiveSolicitud, isArchived, updateSolicitudFromDetail } = useSolicitudesRegistry()
  const [solicitud, setSolicitud] = useState<SolicitudDetail | null>(null)
  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: solicitudId,
    load: loadSolicitudDetail,
    isArchived,
    onLoaded: (id, record) => {
      setSolicitud(record)
      recordEntityView('solicitudes', id)
    },
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [tab, setTab] = useState<DetailTab>('detalle')
  const [projectCount, setProjectCount] = useState(0)
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [activityPresetType, setActivityPresetType] =
    useState<ContactActivityType>('llamada')
  const { onAddNote: handleNoteAdded, onDeleteNote: handleNoteDeleted } = useEntityNotes({
    scope: 'solicitud',
    entityId: solicitudId,
    setRecord: setSolicitud,
    onAdded: () => setTab('notas'),
    onAfterChange: canEdit
      ? (next) => {
          void updateSolicitudFromDetail(next)
        }
      : undefined,
  })

  const handleFilesChange = useCallback(
    async (files: SolicitudDetail['files']) => {
      if (!solicitud || !canEdit) return
      setSolicitud((prev) => (prev ? { ...prev, files } : prev))
      try {
        const saved = await persistSolicitudFiles(solicitud.id, solicitud.title, files)
        setSolicitud((prev) => (prev ? { ...prev, files: saved } : prev))
      } catch (error) {
        toast.error(
          apiActionErrorMessage(error, 'No se pudieron guardar los archivos.'),
        )
      }
    },
    [solicitud, canEdit],
  )

  const handleSolicitudSaved = useCallback(
    async (updated: SolicitudDetail) => {
      try {
        const previousStatus = solicitud?.status
        const saved = await updateSolicitudFromDetail(updated)
        setSolicitud((prev) => {
          if (!prev) return prev
          const nextStatus = saved.status ?? updated.status
          const statusHistory =
            previousStatus && previousStatus !== nextStatus
              ? buildSolicitudStatusHistoryOnTransition(
                  previousStatus,
                  nextStatus,
                  prev.statusHistory,
                )
              : prev.statusHistory
          return {
            ...prev,
            ...saved,
            status: nextStatus,
            files: updated.files ?? saved.files ?? prev.files,
            team: saved.team ?? prev.team,
            statusHistory,
          }
        })
      } catch {
        /* toast handled by dialog */
      }
    },
    [updateSolicitudFromDetail, solicitud?.status],
  )

  const openRegisterActivity = useCallback(
    (presetType: ContactActivityType = 'llamada') => {
      setActivityPresetType(presetType)
      setActivityDialogOpen(true)
    },
    [],
  )

  const handleActivitySaved = useCallback((activity: ContactActivity) => {
    setSolicitud((prev) => {
      if (!prev) return prev
      return { ...prev, activities: [activity, ...prev.activities] }
    })
    setTab('actividad')
  }, [])

  const handleArchiveConfirm = useCallback(async () => {
    if (!solicitudId) return
    try {
      await archiveSolicitud(solicitudId)
      setArchiveOpen(false)
      navigate('/solicitudes')
      toast.success('Solicitud archivada.')
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar la solicitud.'),
      )
    }
  }, [archiveSolicitud, solicitudId, navigate])

  if (loadState === 'loading') {
    return <RecordDetailLoading />
  }

  if (loadState === 'unavailable') {
    return (
      <RecordUnavailableView
        module="solicitudes"
        reason={reason}
        detail={unavailableDetail}
        recordId={solicitudId}
        onRetry={reload}
      />
    )
  }

  if (!solicitud) {
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
          <Link to="/solicitudes">
            <ArrowLeft aria-hidden className="size-4" />
            Solicitudes
          </Link>
        </Button>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        <span className="truncate font-medium text-foreground">{solicitud.title}</span>
      </nav>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ClipboardList aria-hidden className="size-5 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {solicitud.title}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {solicitud.code} · Responsable: {solicitud.assignee || '—'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant={solicitudStatusVariant(solicitud.status)}>{solicitud.status}</Badge>
            <Badge variant={solicitudPriorityVariant(solicitud.priority)}>
              {solicitud.priority}
            </Badge>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canEdit ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Pencil aria-hidden className="size-4" />
              Editar
            </Button>
          ) : null}
          {canRegisterActivity ? (
            <Button type="button" size="sm" variant="outline" onClick={() => openRegisterActivity()}>
              <Zap aria-hidden className="size-4" />
              Nueva actividad
            </Button>
          ) : null}
          {canDelete ? (
            <Button type="button" size="sm" variant="destructive" onClick={() => setArchiveOpen(true)}>
              <Trash2 aria-hidden className="size-4" />
              Archivar
            </Button>
          ) : null}
        </div>
      </div>

      <RegisterActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        relatedType="solicitud"
        contactId={solicitud.id}
        contactName={solicitud.title}
        companyName={solicitud.code}
        defaultAuthor={solicitud.assignee}
        presetType={activityPresetType}
        onSaved={handleActivitySaved}
      />

      {canEdit ? (
        <EditSolicitudDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          solicitud={solicitud}
          onSave={handleSolicitudSaved}
        />
      ) : null}

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar solicitud</DialogTitle>
            <DialogDescription>
              «{solicitud.title}» irá a Archivados (papelera) durante{' '}
              {SOLICITUD_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma definitiva si
              no la restauras.
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

      <SolicitudSuccessPath
        currentStage={solicitud.status}
        history={solicitud.statusHistory}
        readOnly={!canEdit}
        onStageChange={
          canEdit
            ? (stage: SolicitudJourneyStage) => {
                if (
                  !canTransition(solicitud.status, stage, {
                    history: solicitud.statusHistory,
                  })
                ) {
                  return
                }

                const previousStatus = solicitud.status
                const nextSolicitud: SolicitudDetail = {
                  ...solicitud,
                  status: stage,
                  statusHistory: buildSolicitudStatusHistoryOnTransition(
                    previousStatus,
                    stage,
                    solicitud.statusHistory,
                  ),
                }

                void (async () => {
                  try {
                    await updateSolicitudFromDetail(nextSolicitud)
                    setSolicitud(nextSolicitud)
                  } catch (error) {
                    toast.error(
                      apiActionErrorMessage(error, 'No se pudo actualizar el estado de la solicitud.'),
                    )
                  }
                })()
              }
            : undefined
        }
      />

      <div className="min-w-0 space-y-4">
        <div
          className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Secciones de la solicitud"
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
              {id === 'actividad' && solicitud.activities.length > 0 ? (
                <Badge variant="secondary" className="ms-0.5 font-normal">
                  {solicitud.activities.length}
                </Badge>
              ) : null}
              {id === 'archivos' && solicitud.files.length > 0 ? (
                <Badge variant="secondary" className="ms-0.5 font-normal">
                  {solicitud.files.length}
                </Badge>
              ) : null}
              {id === 'proyectos' && projectCount > 0 ? (
                <Badge variant="secondary" className="ms-0.5 font-normal">
                  {projectCount}
                </Badge>
              ) : null}
            </button>
          ))}
        </div>

        {tab === 'detalle' ? (
          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Descripción</CardTitle>
              </CardHeader>
              <CardContent>
                <SolicitudDescriptionContent
                  html={solicitud.description ?? ''}
                  files={solicitud.files ?? []}
                />
              </CardContent>
            </Card>
            <RecordAuditMeta record={solicitud} />
          </div>
        ) : null}

        {tab === 'equipo' ? (
          <SolicitudTeamMembersPanel
            solicitud={solicitud}
            canEdit={canEdit}
            onTeamChange={async (team: SolicitudTeamMember[]) => {
              const previous = solicitud
              const added = collectNewTeamMembersFromLists(
                previous.team ?? [],
                team,
                previous.assignee,
              )
              const dedupedTeam = dedupeSolicitudTeamMembers(team, previous.assignee)
              const next = { ...solicitud, team: dedupedTeam }
              setSolicitud(next)
              try {
                const saved = await updateSolicitudFromDetail(next)
                setSolicitud((p) => (p ? { ...p, team: saved.team ?? team } : p))
                if (added.length > 0) {
                  toast.success(
                    added.length === 1
                      ? `Se agregó a ${added[0]!.name} al equipo.`
                      : `Se agregaron ${added.length} miembros al equipo.`,
                  )
                }
              } catch (error) {
                setSolicitud(previous)
                toast.error(
                  apiActionErrorMessage(error, 'No se pudo actualizar el equipo de la solicitud.'),
                )
                throw error
              }
            }}
          />
        ) : null}

        {tab === 'notas' ? (
          <EntityNotesPanel
            notes={solicitud.notes}
            authorName={solicitud.assignee}
            disabled={!canEdit}
            onAddNote={canEdit ? handleNoteAdded : undefined}
            onDeleteNote={canEdit ? handleNoteDeleted : undefined}
          />
        ) : null}

        {tab === 'proyectos' ? (
          <SolicitudProjectsPanel
            solicitud={solicitud}
            canViewProjects={canViewProjects}
            canCreateProject={canCreateProject}
            onCountChange={setProjectCount}
          />
        ) : null}

        {tab === 'actividad' ? (
          <EntityActivitiesSection
            activities={solicitud.activities}
            entityKind="solicitud"
            onRegister={canRegisterActivity ? () => openRegisterActivity() : undefined}
          />
        ) : null}

        {tab === 'archivos' ? (
          <SolicitudFilesPanel
            authorName={solicitud.assignee}
            files={solicitud.files}
            disabled={!canEdit}
            onFilesChange={handleFilesChange}
          />
        ) : null}
      </div>
    </PageScrollArea>
  )
}
