import {
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  LayoutList,
  StickyNote,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { EditExpenseDialog } from '@/components/gastos/EditExpenseDialog'
import { GastoDetailHeader } from '@/components/gastos/GastoDetailHeader'
import { GastoDetailSidebar } from '@/components/gastos/GastoDetailSidebar'
import { ExpenseFilesPanel as GastoFilesPanel } from '@/components/gastos/GastoFilesPanel'
import { EntityNotesPanel } from '@/components/shared/EntityNotesPanel'
import { RecordAuditMeta } from '@/components/shared/RecordAuditMeta'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ExpenseDetail } from '@/data/expenses.mock'
import { loadExpenseDetail } from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useExpensesRegistry } from '@/hooks/use-expenses-registry'
import { useEntityNotes } from '@/hooks/use-entity-notes'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import { EXPENSE_ARCHIVE_RETENTION_DAYS } from '@/lib/expense-archive'
import { persistExpenseFiles, type ExpenseFile } from '@/lib/expense-files'
import { apiActionErrorMessage } from '@/api/errors'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type DetailTab = 'detalle' | 'archivos' | 'notas'

const tabs: { id: DetailTab; label: string; Icon: typeof LayoutList }[] = [
  { id: 'detalle', label: 'Detalle', Icon: LayoutList },
  { id: 'archivos', label: 'Archivos', Icon: FolderOpen },
  { id: 'notas', label: 'Notas', Icon: StickyNote },
]

export function GastoDetailPage() {
  const navigate = useNavigate()
  const { gastoId } = useParams<{ gastoId: string }>()
  const { canEdit, canDelete } = useModulePermissions('gastos')
  const { archiveExpense, isArchived, updateExpenseFromDetail } = useExpensesRegistry()
  const [expense, setExpense] = useState<ExpenseDetail | null>(null)
  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: gastoId,
    load: loadExpenseDetail,
    isArchived,
    onLoaded: (id, record) => {
      setExpense(record)
      recordEntityView('gastos', id)
    },
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [tab, setTab] = useState<DetailTab>('detalle')

  const { onAddNote: handleNoteAdded, onDeleteNote: handleNoteDeleted } = useEntityNotes({
    scope: 'gasto',
    entityId: gastoId,
    setRecord: setExpense,
    onAdded: () => setTab('notas'),
  })

  const handleFilesChange = useCallback(
    async (files: ExpenseFile[]) => {
      if (!expense) return
      try {
        await persistExpenseFiles(expense.id, expense.number, files)
        const next = { ...expense, files }
        setExpense(next)
        await updateExpenseFromDetail(next)
      } catch (error) {
        toast.error(apiActionErrorMessage(error, 'No se pudieron guardar los archivos.'))
      }
    },
    [expense, updateExpenseFromDetail],
  )

  const handleEditSaved = useCallback(
    async (updated: ExpenseDetail) => {
      try {
        await updateExpenseFromDetail(updated)
        setExpense(updated)
        toast.success(`Gasto «${updated.number}» actualizado.`)
      } catch (error) {
        toast.error(apiActionErrorMessage(error, 'No se pudo actualizar el gasto.'))
      }
    },
    [updateExpenseFromDetail],
  )

  const handleArchiveConfirm = useCallback(async () => {
    if (!expense) return
    try {
      await archiveExpense(expense.id)
      setArchiveOpen(false)
      toast.success(`Gasto «${expense.number}» archivado.`)
      navigate('/gastos')
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo archivar el gasto.'))
    }
  }, [archiveExpense, expense, navigate])

  if (loadState === 'loading' || loadState === 'idle') {
    return <RecordDetailLoading />
  }

  if (loadState === 'unavailable' || !expense) {
    return (
      <RecordUnavailableView
        module="gastos"
        reason={reason}
        detail={unavailableDetail}
        listPath="/gastos"
        listLabel="Gastos"
        onRetry={reload}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageScrollArea className="space-y-4 p-3 pb-8 sm:space-y-5 sm:p-4 sm:pb-10 lg:p-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Button type="button" variant="ghost" size="sm" asChild className="-ms-2">
            <Link to="/gastos">
              <ArrowLeft aria-hidden className="size-4" />
              Gastos
            </Link>
          </Button>
          <ChevronRight aria-hidden className="size-3.5" />
          <span className="font-medium text-foreground">{expense.number}</span>
        </div>

        <GastoDetailHeader
          expense={expense}
          onStartEdit={canEdit ? () => setEditDialogOpen(true) : undefined}
          onArchive={canDelete ? () => setArchiveOpen(true) : undefined}
        />

        <div className="min-w-0 space-y-4">
          <div
            className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Secciones del gasto"
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
                {id === 'archivos' && (expense.files?.length ?? 0) > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {expense.files.length}
                  </Badge>
                ) : null}
                {id === 'notas' && (expense.notes?.length ?? 0) > 0 ? (
                  <Badge variant="secondary" className="ms-0.5 font-normal">
                    {expense.notes.length}
                  </Badge>
                ) : null}
              </button>
            ))}
          </div>

          {tab === 'detalle' ? <GastoDetailSidebar expense={expense} /> : null}

          {tab === 'archivos' ? (
            <GastoFilesPanel
              authorName={expense.owner}
              files={expense.files ?? []}
              disabled={!canEdit}
              onFilesChange={handleFilesChange}
            />
          ) : null}

          {tab === 'notas' ? (
            <EntityNotesPanel
              notes={expense.notes ?? []}
              authorName={expense.owner}
              disabled={!canEdit}
              onAddNote={handleNoteAdded}
              onDeleteNote={handleNoteDeleted}
            />
          ) : null}
        </div>

        <RecordAuditMeta record={expense} />
      </PageScrollArea>

      {canEdit ? (
        <EditExpenseDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          expense={expense}
          onSave={handleEditSaved}
        />
      ) : null}

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar gasto</DialogTitle>
            <DialogDescription>
              «{expense.number}» irá a Archivados durante {EXPENSE_ARCHIVE_RETENTION_DAYS} días.
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
