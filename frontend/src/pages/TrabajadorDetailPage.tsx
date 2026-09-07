import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  ChevronRight,
  FileText,
  FolderOpen,
  LayoutList,
  Pencil,
  Archive as ArchiveIcon,
  StickyNote,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { EditWorkerDialog } from '@/components/trabajadores/EditWorkerDialog'
import { WorkerVacationsPanel } from '@/components/trabajadores/WorkerVacationsPanel'
import { WorkerPayrollsPanel } from '@/components/trabajadores/WorkerPayrollsPanel'
import { ExpenseFilesPanel as WorkerFilesPanel } from '@/components/gastos/GastoFilesPanel'
import { EntityNotesPanel } from '@/components/shared/EntityNotesPanel'
import { RecordAuditMeta } from '@/components/shared/RecordAuditMeta'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { EntityAvatarImage } from '@/components/shared/EntityAvatarImage'
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
import type { WorkerDetail } from '@/data/workers.mock'
import { loadWorkerDetail } from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useWorkersRegistry } from '@/hooks/use-workers-registry'
import { useEntityNotes } from '@/hooks/use-entity-notes'
import { persistEntityFiles, type EntityFilesScope } from '@/lib/entity-files-storage'
import type { EntityFileRecord } from '@/lib/entity-files'
import { workerStatusVariant } from '@/lib/worker-display'
import { apiActionErrorMessage } from '@/api/errors'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type DetailTab = 'datos' | 'contrato' | 'vacaciones' | 'liquidaciones' | 'archivos' | 'notas'

const tabs: { id: DetailTab; label: string; Icon: typeof LayoutList }[] = [
  { id: 'datos', label: 'Datos', Icon: LayoutList },
  { id: 'contrato', label: 'Contrato', Icon: Briefcase },
  { id: 'vacaciones', label: 'Vacaciones', Icon: CalendarDays },
  { id: 'liquidaciones', label: 'Liquidaciones', Icon: FileText },
  { id: 'archivos', label: 'Archivos', Icon: FolderOpen },
  { id: 'notas', label: 'Notas', Icon: StickyNote },
]

const WORKER_FILES_SCOPE: EntityFilesScope = 'trabajador'

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || '—'}</p>
    </div>
  )
}

export function TrabajadorDetailPage() {
  const navigate = useNavigate()
  const { trabajadorId } = useParams<{ trabajadorId: string }>()
  const { canEdit, canDelete } = useModulePermissions('trabajadores')
  const { archiveWorker, isArchived, updateWorkerFromDetail } = useWorkersRegistry()
  const [worker, setWorker] = useState<WorkerDetail | null>(null)
  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: trabajadorId,
    load: loadWorkerDetail,
    isArchived,
    onLoaded: (_id, record) => setWorker(record),
  })
  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [tab, setTab] = useState<DetailTab>('datos')

  const { onAddNote, onDeleteNote } = useEntityNotes({
    scope: 'trabajador',
    entityId: trabajadorId,
    setRecord: setWorker,
    onAdded: () => setTab('notas'),
  })

  const handleFilesChange = useCallback(
    async (files: EntityFileRecord[]) => {
      if (!worker) return
      try {
        await persistEntityFiles(WORKER_FILES_SCOPE, worker.id, worker.number, files)
        setWorker({ ...worker, files })
      } catch (error) {
        toast.error(apiActionErrorMessage(error, 'No se pudieron guardar los archivos.'))
      }
    },
    [worker],
  )

  const handleEditSaved = useCallback(
    async (updated: WorkerDetail) => {
      try {
        await updateWorkerFromDetail(updated)
        // Recargar para recalcular vacaciones/liquidaciones desde el servidor.
        reload()
        toast.success(`Ficha de «${updated.fullName}» actualizada.`)
      } catch (error) {
        toast.error(apiActionErrorMessage(error, 'No se pudo actualizar el trabajador.'))
      }
    },
    [updateWorkerFromDetail, reload],
  )

  const handleArchiveConfirm = useCallback(async () => {
    if (!worker) return
    try {
      await archiveWorker(worker.id)
      setArchiveOpen(false)
      toast.success(`Trabajador «${worker.fullName}» archivado.`)
      navigate('/trabajadores')
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo archivar el trabajador.'))
    }
  }, [archiveWorker, worker, navigate])

  if (loadState === 'loading') {
    return <RecordDetailLoading />
  }

  if (loadState === 'unavailable' || !worker) {
    return (
      <RecordUnavailableView
        module="trabajadores"
        reason={reason}
        detail={unavailableDetail}
        listPath="/trabajadores"
        listLabel="Trabajadores"
        onRetry={reload}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageScrollArea className="space-y-4 p-3 pb-8 sm:space-y-5 sm:p-4 sm:pb-10 lg:p-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Button type="button" variant="ghost" size="sm" asChild className="-ms-2">
            <Link to="/trabajadores">
              <ArrowLeft aria-hidden className="size-4" />
              Trabajadores
            </Link>
          </Button>
          <ChevronRight aria-hidden className="size-3.5" />
          <span className="font-medium text-foreground">{worker.fullName}</span>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-14 border border-border">
              {worker.avatarUrl ? (
                <EntityAvatarImage src={worker.avatarUrl} alt={worker.fullName} />
              ) : null}
              <AvatarFallback>{initials(worker.fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">{worker.fullName}</h1>
                <Badge variant={workerStatusVariant(worker.status)}>{worker.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {worker.jobTitle || '—'}
                {worker.businessUnit ? ` · ${worker.businessUnit}` : ''} · {worker.number}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canEdit ? (
              <Button type="button" variant="outline" className="border-border" onClick={() => setEditOpen(true)}>
                <Pencil aria-hidden className="size-4" />
                Editar
              </Button>
            ) : null}
            {canDelete ? (
              <Button type="button" variant="outline" className="border-border" onClick={() => setArchiveOpen(true)}>
                <ArchiveIcon aria-hidden className="size-4" />
                Archivar
              </Button>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div
            className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
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
                  tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon aria-hidden className="size-4 opacity-70" />
                {label}
              </button>
            ))}
          </div>

          {tab === 'datos' ? (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Datos personales</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="RUT" value={worker.taxId} />
                <Field label="Email" value={worker.email} />
                <Field label="Teléfono" value={worker.phone} />
                <Field label="Dirección" value={worker.address} />
                <Field label="Responsable" value={worker.owner} />
              </CardContent>
            </Card>
          ) : null}

          {tab === 'contrato' ? (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Contrato y remuneración</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Cargo" value={worker.jobTitle} />
                <Field label="Unidad de negocio" value={worker.businessUnit} />
                <Field label="Tipo de contrato" value={String(worker.contractType)} />
                <Field label="Jornada (hrs)" value={String(worker.workHours)} />
                <Field label="Fecha ingreso" value={worker.startDate} />
                <Field label="Fecha término" value={worker.endDate} />
                <Field label="Sueldo base" value={worker.baseSalary} />
                <Field label="Gratificación" value={worker.gratification} />
                <Field label="AFP" value={`${worker.afpName} (${worker.afpRate}%)`} />
                <Field label="Salud" value={`${worker.healthInstitution} ${worker.healthPlan}`.trim()} />
                <Field label="AFC" value={`${worker.afcRate}%`} />
                <Field label="Día de pago" value={String(worker.paydayDay)} />
                <Field label="Funciones" value={worker.jobFunctions} />
              </CardContent>
            </Card>
          ) : null}

          {tab === 'vacaciones' ? (
            <WorkerVacationsPanel worker={worker} canEdit={canEdit} onChanged={reload} />
          ) : null}

          {tab === 'liquidaciones' ? (
            <WorkerPayrollsPanel worker={worker} canEdit={canEdit} onChanged={reload} />
          ) : null}

          {tab === 'archivos' ? (
            <WorkerFilesPanel
              authorName={worker.owner}
              files={worker.files ?? []}
              disabled={!canEdit}
              onFilesChange={handleFilesChange}
            />
          ) : null}

          {tab === 'notas' ? (
            <EntityNotesPanel
              notes={worker.notes ?? []}
              authorName={worker.owner}
              disabled={!canEdit}
              onAddNote={onAddNote}
              onDeleteNote={onDeleteNote}
            />
          ) : null}
        </div>

        <RecordAuditMeta record={worker} />
      </PageScrollArea>

      {canEdit ? (
        <EditWorkerDialog open={editOpen} onOpenChange={setEditOpen} worker={worker} onSave={handleEditSaved} />
      ) : null}

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar trabajador</DialogTitle>
            <DialogDescription>
              «{worker.fullName}» se moverá a Archivados. Podrás restaurarlo más tarde.
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
    </div>
  )
}
