import {
  ArrowLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  History,
  LayoutList,
  StickyNote,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ActivityDetailHeader } from '@/components/activities/ActivityDetailHeader'
import { ActivityDetailSidebar } from '@/components/activities/ActivityDetailSidebar'
import { EditActivityDialog } from '@/components/activities/EditActivityDialog'
import { ActivitySuccessPath } from '@/components/activities/ActivitySuccessPath'
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
import type { ActivityDetail } from '@/data/activity-detail.mock'
import { normalizeActivityDetail } from '@/lib/activity-detail-normalize'
import { loadActivityDetail } from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { useActivitiesRegistry } from '@/hooks/use-activities-registry'
import { useEntityNotes } from '@/hooks/use-entity-notes'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import { ACTIVITY_ARCHIVE_RETENTION_DAYS } from '@/lib/activity-archive'
import { activityStatusVariant } from '@/lib/activity-display'
import {
  activityDetailWithStatus,
  journeyHistoryFromStatusHistory,
} from '@/lib/activity-journey'
import type { ActivityStatus } from '@/data/activities.mock'
import { apiActionErrorMessage } from '@/api/errors'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type DetailTab = 'detalle' | 'historial' | 'notas' | 'archivos'

const tabs: { id: DetailTab; label: string; Icon: typeof LayoutList }[] = [
  { id: 'detalle', label: 'Detalle', Icon: LayoutList },
  { id: 'historial', label: 'Historial', Icon: History },
  { id: 'notas', label: 'Notas', Icon: StickyNote },
  { id: 'archivos', label: 'Archivos', Icon: FolderOpen },
]

export function ActivityDetailPage() {
  const navigate = useNavigate()
  const { activityId } = useParams<{ activityId: string }>()
  const { canEdit, canDelete } = useModulePermissions('actividades')
  const { archiveActivity, isArchived, updateActivityFromDetail, updateActivityStatus } =
    useActivitiesRegistry()
  const [activity, setActivity] = useState<ActivityDetail | null>(null)
  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: activityId,
    load: loadActivityDetail,
    isArchived,
    onLoaded: (id, record) => {
      setActivity(record)
      recordEntityView('actividades', id)
    },
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [tab, setTab] = useState<DetailTab>('detalle')
  const { onAddNote: handleNoteAdded, onDeleteNote: handleNoteDeleted } = useEntityNotes({
    scope: 'actividad',
    entityId: activityId,
    setRecord: setActivity,
    onAdded: () => setTab('notas'),
    onAfterChange: (next) => {
      void updateActivityFromDetail(normalizeActivityDetail(next))
    },
  })

  const handleActivitySaved = useCallback(
    async (updated: ActivityDetail) => {
      try {
        await updateActivityFromDetail(updated)
        setActivity(normalizeActivityDetail(updated))
      } catch {
        toast.error('No se pudo guardar la actividad.')
      }
    },
    [updateActivityFromDetail],
  )

  const handleArchiveConfirm = useCallback(async () => {
    if (!activityId) return
    try {
      await archiveActivity(activityId)
      setArchiveOpen(false)
      navigate('/actividades')
      toast.success('Actividad archivada.')
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar la actividad.'),
      )
    }
  }, [archiveActivity, activityId, navigate])

  const persistStatusChange = useCallback(
    async (status: ActivityStatus) => {
      if (!activity) return
      const next = activityDetailWithStatus(activity, status)
      try {
        await updateActivityStatus(activity, status)
        setActivity(next)
      } catch {
        toast.error('No se pudo actualizar el estado.')
      }
    },
    [activity, updateActivityStatus],
  )

  const markComplete = useCallback(() => {
    void persistStatusChange('Completada')
  }, [persistStatusChange])

  const handleStatusChange = useCallback(
    (status: ActivityStatus) => {
      void persistStatusChange(status)
    },
    [persistStatusChange],
  )

  if (loadState === 'loading') {
    return <RecordDetailLoading />
  }

  if (loadState === 'unavailable') {
    return (
      <RecordUnavailableView
        module="actividades"
        reason={reason}
        detail={unavailableDetail}
        recordId={activityId}
      onRetry={reload}
      />
    )
  }

  if (!activity) {
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
          <Link to="/actividades">
            <ArrowLeft aria-hidden className="size-4" />
            Actividades
          </Link>
        </Button>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        <span className="truncate font-medium text-foreground">{activity.title}</span>
      </nav>

      <ActivityDetailHeader
        activity={activity}
        onStartEdit={canEdit ? () => setEditDialogOpen(true) : undefined}
        onMarkComplete={markComplete}
        onArchive={canDelete ? () => setArchiveOpen(true) : undefined}
      />

      {canEdit ? (
        <EditActivityDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          activity={activity}
          onSave={handleActivitySaved}
        />
      ) : null}

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar actividad</DialogTitle>
            <DialogDescription>
              «{activity.title}» irá a Archivados (papelera) durante{' '}
              {ACTIVITY_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma definitiva si no
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

      <ActivitySuccessPath
        currentStage={activity.status}
        history={journeyHistoryFromStatusHistory(activity.statusHistory)}
        onStageChange={handleStatusChange}
      />

      <div className="min-w-0 space-y-4">
        <div
          className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Secciones de la actividad"
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

        {tab === 'detalle' ? (
          <div className="space-y-4">
            <ActivityDetailSidebar activity={activity} />
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Descripción</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {activity.description}
                  </p>
                </CardContent>
              </Card>
            <RecordAuditMeta record={activity} />
          </div>
        ) : null}

        {tab === 'historial' ? (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Historial de estados</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {activity.statusHistory.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-4 py-3"
                    >
                      <Badge variant={activityStatusVariant(entry.status)}>
                        {entry.status}
                      </Badge>
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
              notes={activity.notes}
              authorName={activity.assignee}
              onAddNote={handleNoteAdded}
              onDeleteNote={handleNoteDeleted}
            />
          ) : null}

          {tab === 'archivos' ? (
            <Card className="shadow-sm">
              <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12 text-center">
                <FileText aria-hidden className="mb-3 size-10 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Sin archivos adjuntos</p>
              </CardContent>
            </Card>
          ) : null}
      </div>
    </PageScrollArea>
  )
}
