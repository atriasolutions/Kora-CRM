import {
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  Info,
  LayoutList,
  StickyNote,
  Users,
  Zap,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { EditProjectDialog } from '@/components/projects/EditProjectDialog'
import { ProjectDetailHeader } from '@/components/projects/ProjectDetailHeader'
import { ProjectDetailSidebar } from '@/components/projects/ProjectDetailSidebar'
import { ProjectFilesPanel } from '@/components/projects/ProjectFilesPanel'
import { ProjectSuccessPath } from '@/components/projects/ProjectSuccessPath'
import { RegisterActivityDialog } from '@/components/contacts/RegisterActivityDialog'
import { EntityActivitiesSection } from '@/components/shared/EntityActivitiesSection'
import { EntityNotesPanel } from '@/components/shared/EntityNotesPanel'
import { Badge } from '@/components/ui/badge'
import { RecordAuditMeta } from '@/components/shared/RecordAuditMeta'
import { ProjectWorkBoard } from '@/components/projects/workboard/ProjectWorkBoard'
import { ProjectTeamMembersPanel } from '@/components/projects/ProjectTeamMembersPanel'
import type { ProjectTeamMember } from '@/data/project-detail.mock'
import { useAssigneeDirectory } from '@/hooks/use-assignee-directory'
import { useProjectWorkPlan } from '@/hooks/use-project-work-plan'
import { isApiEnabled } from '@/api/config'
import {
  collectNewWorkPlanAssigneeNames,
  collectWorkPlanAssigneeNames,
} from '@/lib/project-work-assignees'
import {
  collectNewTeamMembersFromLists,
  collectProjectTeamMemberNames,
  dedupeProjectTeamMembers,
  mergeAssigneesIntoProjectTeam,
} from '@/lib/project-team-access'
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
import type { ProjectDetail } from '@/data/project-detail.mock'
import { loadProjectDetail } from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { useProjectsRegistry } from '@/hooks/use-projects-registry'
import { useEntityNotes } from '@/hooks/use-entity-notes'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import { PROJECT_ARCHIVE_RETENTION_DAYS } from '@/lib/project-archive'
import { persistProjectFiles } from '@/lib/project-files'
import {
  buildJourneyHistoryOnTransition,
  canTransition,
  journeyToListStatus,
  saveJourneyOverride,
  type ProjectJourneyStage,
} from '@/lib/project-journey'
import { saveProjectRelationsOverride } from '@/lib/project-relations'
import { apiActionErrorMessage } from '@/api/errors'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type DetailTab = 'detalle' | 'informacion' | 'equipo' | 'actividad' | 'notas' | 'archivos'

const tabs: { id: DetailTab; label: string; Icon: typeof LayoutList }[] = [
  { id: 'detalle', label: 'Detalle', Icon: LayoutList },
  { id: 'informacion', label: 'Información', Icon: Info },
  { id: 'actividad', label: 'Actividad', Icon: Zap },
  { id: 'equipo', label: 'Equipo', Icon: Users },
  { id: 'notas', label: 'Notas', Icon: StickyNote },
  { id: 'archivos', label: 'Archivos', Icon: FolderOpen },
]

export function ProjectDetailPage() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const { canEdit, canDelete } = useModulePermissions('proyectos')
  const { canCreate: canCreateActivity } = useModulePermissions('actividades')
  const { archiveProject, isArchived, updateProject, updateProjectFromDetail } =
    useProjectsRegistry()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const reloadProject = useCallback(async () => {
    if (!projectId) return
    try {
      const fresh = await loadProjectDetail(projectId)
      setProject(fresh)
    } catch {
      /* ignore refresh errors */
    }
  }, [projectId])
  const { plan, setPlan: persistPlan, metrics } = useProjectWorkPlan(projectId, {
    readOnly: !canEdit,
    onPlanPersisted: reloadProject,
  })
  const { allUsers } = useAssigneeDirectory(canEdit)
  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: projectId,
    load: loadProjectDetail,
    isArchived,
    onLoaded: (id, record) => {
      setProject(record)
      recordEntityView('proyectos', id)
    },
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [tab, setTab] = useState<DetailTab>('detalle')
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [activityPresetType, setActivityPresetType] =
    useState<ContactActivityType>('llamada')
  const { onAddNote: handleNoteAdded, onDeleteNote: handleNoteDeleted } = useEntityNotes({
    scope: 'proyecto',
    entityId: projectId,
    setRecord: setProject,
    onAdded: () => setTab('notas'),
    onAfterChange: canEdit
      ? (next) => {
          void updateProjectFromDetail(next)
        }
      : undefined,
  })

  const handlePlanChange = useCallback(
    (
      next: import('@/types/project-work-plan').ProjectWorkPlan,
      options?: import('@/lib/project-work-plan').WorkPlanPersistOptions,
    ) => {
      if (plan && project && canEdit) {
        const newAssignees = collectNewWorkPlanAssigneeNames(plan, next)
        if (newAssignees.length > 0) {
          const mergedTeam = mergeAssigneesIntoProjectTeam(
            project.team ?? [],
            newAssignees,
            project.manager,
            allUsers,
          )
          if (mergedTeam.length > (project.team?.length ?? 0)) {
            const withTeam = { ...project, team: mergedTeam }
            setProject(withTeam)
            if (!isApiEnabled()) {
              void updateProjectFromDetail(withTeam).catch(() => {
                /* toast on explicit save */
              })
            }
          }
        }
      }
      persistPlan(next, options)
    },
    [plan, project, canEdit, allUsers, persistPlan, updateProjectFromDetail],
  )

  const handleFilesChange = useCallback(
    async (files: ProjectDetail['files']) => {
      if (!project || !canEdit) return
      setProject((prev) => (prev ? { ...prev, files } : prev))
      try {
        const saved = await persistProjectFiles(project.id, project.name, files)
        setProject((prev) => (prev ? { ...prev, files: saved } : prev))
      } catch (error) {
        toast.error(
          apiActionErrorMessage(error, 'No se pudieron guardar los archivos.'),
        )
      }
    },
    [project, canEdit],
  )

  const handleProjectSaved = useCallback(
    async (updated: ProjectDetail) => {
      const opportunityId = updated.opportunityId?.trim() || undefined
      const acceptedQuoteId = updated.acceptedQuoteId?.trim() || undefined
      saveProjectRelationsOverride(updated.id, {
        opportunityId: opportunityId ?? null,
        acceptedQuoteId: acceptedQuoteId ?? null,
      })
      try {
        await updateProjectFromDetail(updated)
        setProject(updated)
      } catch {
        /* toast handled by caller if needed */
      }
    },
    [updateProjectFromDetail],
  )

  const openRegisterActivity = useCallback(
    (presetType: ContactActivityType = 'llamada') => {
      setActivityPresetType(presetType)
      setActivityDialogOpen(true)
    },
    [],
  )

  const handleActivitySaved = useCallback(
    (activity: ContactActivity) => {
      setProject((prev) => {
        if (!prev) return prev
        const next = { ...prev, activities: [activity, ...prev.activities] }
        if (canEdit) void updateProjectFromDetail(next)
        return next
      })
      setTab('actividad')
    },
    [updateProjectFromDetail, canEdit],
  )

  const handleArchiveConfirm = useCallback(async () => {
    if (!projectId) return
    try {
      await archiveProject(projectId)
      setArchiveOpen(false)
      navigate('/proyectos')
      toast.success('Proyecto archivado.')
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar el proyecto.'),
      )
    }
  }, [archiveProject, projectId, navigate])

  if (loadState === 'loading') {
    return <RecordDetailLoading />
  }

  if (loadState === 'unavailable') {
    return (
      <RecordUnavailableView
        module="proyectos"
        reason={reason}
        detail={unavailableDetail}
        recordId={projectId}
      onRetry={reload}
      />
    )
  }

  if (!project) {
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
          <Link to="/proyectos">
            <ArrowLeft aria-hidden className="size-4" />
            Proyectos
          </Link>
        </Button>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        <span className="truncate font-medium text-foreground">{project.name}</span>
      </nav>

      <ProjectDetailHeader
        project={project}
        workMetrics={metrics ?? undefined}
        onStartEdit={canEdit ? () => setEditDialogOpen(true) : undefined}
        onRegisterActivity={canCreateActivity ? openRegisterActivity : undefined}
        onArchive={canDelete ? () => setArchiveOpen(true) : undefined}
      />

      <RegisterActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        relatedType="proyecto"
        contactId={project.id}
        contactName={project.name}
        companyName={project.client}
        defaultAuthor={project.manager}
        presetType={activityPresetType}
        onSaved={handleActivitySaved}
      />

      {canEdit ? (
        <EditProjectDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          project={project}
          onSave={handleProjectSaved}
        />
      ) : null}

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar proyecto</DialogTitle>
            <DialogDescription>
              «{project.name}» irá a Archivados (papelera) durante {PROJECT_ARCHIVE_RETENTION_DAYS}{' '}
              días. Después se eliminará de forma definitiva si no lo restauras.
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

      <ProjectSuccessPath
        currentStage={project.journeyStage}
        history={project.journeyHistory}
        readOnly={!canEdit}
        onStageChange={
          canEdit
            ? (stage: ProjectJourneyStage) => {
                if (
                  !canTransition(project.journeyStage, stage, {
                    history: project.journeyHistory,
                  })
                ) {
                  return
                }
                saveJourneyOverride(project.id, stage)
                void updateProject(project.id, {
                  journeyStage: stage,
                  status: journeyToListStatus(stage),
                })
                setProject((prev) =>
                  prev
                    ? {
                        ...prev,
                        journeyStage: stage,
                        status: journeyToListStatus(stage),
                        journeyHistory: buildJourneyHistoryOnTransition(
                          prev.journeyStage,
                          stage,
                          prev.journeyHistory,
                        ),
                      }
                    : prev,
                )
              }
            : undefined
        }
      />

      <div className="min-w-0 space-y-4">
          <div
            className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Secciones del proyecto"
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
                {id === 'actividad' && project.activities.length > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {project.activities.length}
                  </Badge>
                ) : null}
                {id === 'archivos' && project.files.length > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {project.files.length}
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
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {project.description}
                  </p>
                </CardContent>
              </Card>
              {plan && metrics ? (
                <ProjectWorkBoard
                  plan={plan}
                  metrics={metrics}
                  onChange={handlePlanChange}
                  readOnly={!canEdit}
                  projectTitle={project.name}
                  teamMemberNames={collectProjectTeamMemberNames(project)}
                />
              ) : null}
              <RecordAuditMeta record={project} />
            </div>
          ) : null}

          {tab === 'informacion' ? (
            <ProjectDetailSidebar
              project={project}
              workPlanTeamNames={plan ? collectWorkPlanAssigneeNames(plan) : []}
            />
          ) : null}

          {tab === 'equipo' && project ? (
            <ProjectTeamMembersPanel
              project={project}
              canEdit={canEdit}
              onTeamChange={async (team: ProjectTeamMember[]) => {
                const previous = project
                const added = collectNewTeamMembersFromLists(
                  previous.team ?? [],
                  team,
                  previous.manager,
                )
                const dedupedTeam = dedupeProjectTeamMembers(team, previous.manager)
                const next = { ...project, team: dedupedTeam }
                setProject(next)
                try {
                  const saved = await updateProjectFromDetail(next)
                  setProject((p) => (p ? { ...p, team: saved.team ?? team } : p))
                  if (added.length > 0) {
                    toast.success(
                      added.length === 1
                        ? `Se agregó a ${added[0]!.name} al equipo. Se envió notificación y correo si el usuario tiene email activo.`
                        : `Se agregaron ${added.length} miembros al equipo.`,
                    )
                  }
                } catch (error) {
                  setProject(previous)
                  toast.error(
                    apiActionErrorMessage(error, 'No se pudo actualizar el equipo del proyecto.'),
                  )
                  throw error
                }
              }}
            />
          ) : null}

          {tab === 'notas' ? (
            <EntityNotesPanel
              notes={project.notes}
              authorName={project.manager}
              disabled={!canEdit}
              onAddNote={canEdit ? handleNoteAdded : undefined}
              onDeleteNote={canEdit ? handleNoteDeleted : undefined}
            />
          ) : null}

          {tab === 'actividad' ? (
            <EntityActivitiesSection
              activities={project.activities}
              entityKind="proyecto"
              onRegister={
                canCreateActivity ? () => openRegisterActivity() : undefined
              }
            />
          ) : null}

          {tab === 'archivos' ? (
            <ProjectFilesPanel
              authorName={project.manager}
              files={project.files}
              disabled={!canEdit}
              onFilesChange={handleFilesChange}
            />
          ) : null}
      </div>
    </PageScrollArea>
  )
}
