import { ArrowLeft, ChevronRight, LayoutList } from 'lucide-react'
import { useState } from 'react'
import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { BitacoraDetailHeader } from '@/components/bitacora/BitacoraDetailHeader'
import { BitacoraDetailSidebar } from '@/components/bitacora/BitacoraDetailSidebar'
import { EditBitacoraDialog } from '@/components/bitacora/EditBitacoraDialog'
import { RecordAuditMeta } from '@/components/shared/RecordAuditMeta'
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
import type { BitacoraListItem } from '@/data/bitacora.mock'
import { loadBitacoraDetail } from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { useBitacoraRegistry } from '@/hooks/use-bitacora-registry'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import { apiActionErrorMessage } from '@/api/errors'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import type { BitacoraFormValues } from '@/lib/bitacora-form'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type DetailTab = 'detalle'

const tabs: { id: DetailTab; label: string; Icon: typeof LayoutList }[] = [
  { id: 'detalle', label: 'Detalle', Icon: LayoutList },
]

export function BitacoraDetailPage() {
  const navigate = useNavigate()
  const { bitacoraId } = useParams<{ bitacoraId: string }>()
  const { canEdit, canDelete } = useModulePermissions('bitacora')
  const { updateBitacoraFromForm, archiveBitacora } = useBitacoraRegistry()
  const [entry, setEntry] = useState<BitacoraListItem | null>(null)
  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: bitacoraId,
    load: loadBitacoraDetail,
    onLoaded: (id, record) => {
      setEntry(record)
      recordEntityView('bitacora', id)
    },
  })
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [tab] = useState<DetailTab>('detalle')

  const handleEdit = async (values: BitacoraFormValues) => {
    if (!entry) return
    try {
      const saved = await updateBitacoraFromForm(entry, values)
      setEntry(saved)
      toast.success('Bitácora actualizada.')
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo actualizar la bitácora.'))
      throw error
    }
  }

  const handleDelete = async () => {
    if (!entry) return
    try {
      await archiveBitacora(entry.id)
      toast.success('Registro de bitácora archivado.')
      navigate('/bitacora')
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo archivar la bitácora.'))
    } finally {
      setDeleteOpen(false)
    }
  }

  if (loadState === 'loading') return <RecordDetailLoading />
  if (loadState === 'unavailable') {
    return (
      <RecordUnavailableView
        module="bitacora"
        reason={reason}
        detail={unavailableDetail}
        recordId={bitacoraId}
        onRetry={reload}
      />
    )
  }
  if (!entry) return <RecordDetailLoading />

  const breadcrumbLabel =
    entry.solicitudCode?.trim() ||
    entry.solicitudTitle?.trim() ||
    'Registro'

  return (
    <PageScrollArea className="space-y-4 p-3 pb-8 sm:space-y-5 sm:p-4 sm:pb-10 lg:p-6">
      <nav aria-label="Miga de pan" className="flex flex-wrap items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link to="/bitacora">
            <ArrowLeft aria-hidden className="size-4" />
            Bitácora
          </Link>
        </Button>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        <span className="truncate font-medium text-foreground">{breadcrumbLabel}</span>
      </nav>

      <BitacoraDetailHeader
        entry={entry}
        onStartEdit={canEdit ? () => setEditOpen(true) : undefined}
        onDelete={canDelete ? () => setDeleteOpen(true) : undefined}
      />

      {canEdit ? (
        <EditBitacoraDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          entry={entry}
          onSubmit={handleEdit}
        />
      ) : null}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar registro</DialogTitle>
            <DialogDescription>
              Este registro de bitácora ({entry.solicitudCode || 'sin código'}) irá a Archivados. Esta
              acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()}>
              Archivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-w-0 space-y-4">
        <div
          className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Secciones de la bitácora"
        >
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
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
            <BitacoraDetailSidebar entry={entry} />
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Descripción</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {entry.description?.trim() || 'Sin descripción del trabajo realizado.'}
                </p>
              </CardContent>
            </Card>
            <RecordAuditMeta record={entry} />
          </div>
        ) : null}
      </div>
    </PageScrollArea>
  )
}
