import { Copy, Eye, ImageIcon, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import {
  PruebaCasoDetailDialog,
  type PruebaCasoDialogMode,
} from '@/components/pruebas-solicitud/PruebaCasoDetailDialog'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { PruebaCaso } from '@/data/pruebas-solicitud.mock'
import { emptyPruebaCaso } from '@/data/pruebas-solicitud.mock'
import { useAuth } from '@/hooks/use-auth'
import { formatChileDateTimeDisplay } from '@/lib/chile-timezone'
import {
  casoEvidencePreview,
  casoHasEvidence,
  displayPruebaCaseNumber,
  okStatusLabel,
} from '@/lib/prueba-caso-display'
import { isGuestPruebaEditor } from '@/lib/prueba-solicitud-guest-access'
import { cn } from '@/lib/utils'

type PruebaCasosTableProps = {
  pruebaCode: string
  cases: PruebaCaso[]
  onChange: (cases: PruebaCaso[]) => void
  onPersist?: (cases: PruebaCaso[]) => Promise<void>
  onDuplicateCase?: (index: number) => Promise<void>
  onDeleteCase?: (index: number) => Promise<void>
  caseActionsBusy?: boolean
  onClientReview?: (casoId: string, patch: { clientOk: boolean; clientNotes: string }) => void
  readOnly?: boolean
  canAdd?: boolean
  className?: string
}

type CaseDialogState =
  | { mode: 'create'; draft: PruebaCaso }
  | { mode: 'view'; index: number; draft: PruebaCaso }
  | { mode: 'edit'; index: number; draft: PruebaCaso }
  | null

function OkBadge({ ok }: { ok: boolean | null | undefined }) {
  if (ok === true) {
    return (
      <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600">
        OK
      </Badge>
    )
  }
  if (ok === false) {
    return <Badge variant="destructive">No OK</Badge>
  }
  return <Badge variant="secondary">Pendiente</Badge>
}

export function PruebaCasosTable({
  pruebaCode,
  cases,
  onChange,
  onPersist,
  onDuplicateCase,
  onDeleteCase,
  caseActionsBusy = false,
  onClientReview,
  readOnly = false,
  canAdd = false,
  className,
}: PruebaCasosTableProps) {
  const { profile } = useAuth()
  const isGuest = isGuestPruebaEditor(profile)
  const canEditCases = !readOnly
  const [dialog, setDialog] = useState<CaseDialogState>(null)
  const [persisting, setPersisting] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const [duplicatingIndex, setDuplicatingIndex] = useState<number | null>(null)

  const openCreate = () => {
    setDialog({
      mode: 'create',
      draft: emptyPruebaCaso(cases.length, pruebaCode),
    })
  }

  const openView = (index: number) => {
    const caso = cases[index]
    if (!caso) return
    setDialog({ mode: 'view', index, draft: caso })
  }

  const openEdit = (index: number) => {
    const caso = cases[index]
    if (!caso) return
    setDialog({ mode: 'edit', index, draft: caso })
  }

  const handleDialogSave = async (saved: PruebaCaso) => {
    if (!dialog) return
    const nextCases =
      dialog.mode === 'create' ? [...cases, saved] : cases.map((c, i) => (i === dialog.index ? saved : c))
    onChange(nextCases)
    if (!onPersist) {
      setDialog(null)
      return
    }
    setPersisting(true)
    try {
      await onPersist(nextCases)
      setDialog(null)
    } catch (error) {
      throw error
    } finally {
      setPersisting(false)
    }
  }

  const handleDuplicate = async (index: number) => {
    if (!onDuplicateCase || caseActionsBusy) return
    setDuplicatingIndex(index)
    try {
      await onDuplicateCase(index)
    } finally {
      setDuplicatingIndex(null)
    }
  }

  const handleDelete = async () => {
    if (deleteIndex == null || !onDeleteCase || caseActionsBusy) return
    const index = deleteIndex
    setDeleteIndex(null)
    await onDeleteCase(index)
  }

  const renderCaseActions = (index: number) => (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Acciones del caso"
            disabled={caseActionsBusy && duplicatingIndex === index}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => openView(index)}>
            <Eye className="size-4" />
            Ver
          </DropdownMenuItem>
          {canEditCases ? (
            <DropdownMenuItem onClick={() => openEdit(index)}>
              <Pencil className="size-4" />
              {isGuest ? 'Revisar' : 'Editar'}
            </DropdownMenuItem>
          ) : null}
          {onDuplicateCase ? (
            <DropdownMenuItem
              onClick={() => void handleDuplicate(index)}
              disabled={caseActionsBusy}
            >
              <Copy className="size-4" />
              Duplicar
            </DropdownMenuItem>
          ) : null}
          {onDeleteCase ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteIndex(index)}
                disabled={caseActionsBusy}
              >
                <Trash2 className="size-4" />
                Eliminar
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  return (
    <>
      {canAdd ? (
        <div className="flex justify-end border-b border-border px-4 py-3 sm:px-6">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="size-4" />
            Agregar caso
          </Button>
        </div>
      ) : null}

      {cases.length === 0 ? (
        <div className="px-4 py-10 text-center sm:px-6">
          <p className="text-sm text-muted-foreground">
            Aún no hay casos de prueba documentados.
          </p>
          {canAdd ? (
            <Button type="button" className="mt-4 gap-1.5" size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              Crear primer caso
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className={cn('hidden overflow-x-auto md:block', className)}>
            <table className="w-full min-w-[56rem] table-fixed text-sm">
              <colgroup>
                <col className="w-[7rem]" />
                <col />
                <col className="w-[9.5rem]" />
                <col className="w-[7.5rem]" />
                <col className="w-[14rem]" />
                <col className="w-[3.5rem]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Caso</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">OK ejecutor</th>
                  <th className="px-4 py-3 font-medium">OK cliente</th>
                  <th className="px-4 py-3 font-medium">Evidencias</th>
                  <th className="px-4 py-3 font-medium text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((caso, index) => (
                  <tr
                    key={caso.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                  >
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => openView(index)}
                        className="font-mono text-sm font-semibold text-primary hover:underline"
                      >
                        {displayPruebaCaseNumber(caso.code || `${pruebaCode}-CP-${index + 1}`)}
                      </button>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="line-clamp-2 text-sm">{caso.shortDescription || '—'}</p>
                      {casoEvidencePreview(caso.inputData, 80) ? (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {casoEvidencePreview(caso.inputData, 80)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <OkBadge ok={caso.executorOk} />
                      {caso.executorOkAt ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatChileDateTimeDisplay(caso.executorOkAt)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <OkBadge ok={caso.clientOk} />
                      {caso.clientOkAt ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatChileDateTimeDisplay(caso.clientOkAt)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {casoHasEvidence(caso.evidenceHtml) ? (
                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <ImageIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                          <span className="line-clamp-2">
                            {casoEvidencePreview(caso.evidenceHtml, 90) || 'Con imágenes'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin evidencias</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {renderCaseActions(index)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {cases.map((caso, index) => (
              <div
                key={caso.id}
                className="flex items-start gap-3 px-4 py-4 sm:px-6"
              >
                <button
                  type="button"
                  onClick={() => openView(index)}
                  className="min-w-0 flex-1 space-y-2 text-start transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-primary">
                      {displayPruebaCaseNumber(caso.code || `${pruebaCode}-CP-${index + 1}`)}
                    </span>
                    <OkBadge ok={caso.executorOk} />
                    <OkBadge ok={caso.clientOk} />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {caso.shortDescription || 'Sin descripción'}
                  </p>
                  {casoHasEvidence(caso.evidenceHtml) ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      <ImageIcon className="mr-1 inline size-3.5 text-primary" />
                      {casoEvidencePreview(caso.evidenceHtml, 100) || 'Evidencias adjuntas'}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Ejecutor: {okStatusLabel(caso.executorOk)} · Cliente:{' '}
                    {okStatusLabel(caso.clientOk)}
                  </p>
                </button>
                <div className="shrink-0">{renderCaseActions(index)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {dialog ? (
        <PruebaCasoDetailDialog
          open={dialog != null}
          onOpenChange={(open) => {
            if (!open) setDialog(null)
          }}
          mode={dialog.mode as PruebaCasoDialogMode}
          caso={dialog.draft}
          onSave={handleDialogSave}
          onClientReview={onClientReview}
          readOnly={readOnly}
          saving={persisting}
        />
      ) : null}

      <Dialog open={deleteIndex != null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar caso</DialogTitle>
            <DialogDescription>
              {deleteIndex != null ? (
                <>
                  Se eliminará{' '}
                  <span className="font-medium text-foreground">
                    {displayPruebaCaseNumber(
                      cases[deleteIndex]?.code || `${pruebaCode}-CP-${deleteIndex + 1}`,
                    )}
                  </span>{' '}
                  y sus evidencias asociadas. Esta acción no se puede deshacer.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteIndex(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={caseActionsBusy || duplicatingIndex != null}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
