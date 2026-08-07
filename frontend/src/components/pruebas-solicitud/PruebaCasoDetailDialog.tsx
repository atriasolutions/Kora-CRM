import { ImageIcon, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'

import { PruebaCasoEvidenceDialog } from '@/components/pruebas-solicitud/PruebaCasoEvidenceDialog'
import { PruebaCasoEvidencePreview } from '@/components/pruebas-solicitud/PruebaCasoEvidencePreview'
import { ContactFormCheckbox, ContactFormField } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PruebaCaso } from '@/data/pruebas-solicitud.mock'
import { useAuth } from '@/hooks/use-auth'
import { formatChileDateTimeDisplay } from '@/lib/chile-timezone'
import { getCurrentUserName } from '@/lib/current-user'
import {
  canGuestEditPruebaCaseField,
  isGuestPruebaEditor,
} from '@/lib/prueba-solicitud-guest-access'
import { displayPruebaCaseNumber } from '@/lib/prueba-caso-display'

export type PruebaCasoDialogMode = 'create' | 'view' | 'edit'

type PruebaCasoDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: PruebaCasoDialogMode
  caso: PruebaCaso
  onSave: (caso: PruebaCaso) => void | Promise<void>
  onClientReview?: (casoId: string, patch: { clientOk: boolean; clientNotes: string }) => void
  readOnly?: boolean
  saving?: boolean
}

const textareaClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed'

function ReadOnlyBlock({ label, value }: { label: string; value: string }) {
  return (
    <ContactFormField label={label}>
      <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm whitespace-pre-wrap">
        {value.trim() || '—'}
      </div>
    </ContactFormField>
  )
}

export function PruebaCasoDetailDialog({
  open,
  onOpenChange,
  mode,
  caso: initialCaso,
  onSave,
  onClientReview,
  readOnly = false,
  saving = false,
}: PruebaCasoDetailDialogProps) {
  const { profile } = useAuth()
  const isGuest = isGuestPruebaEditor(profile)
  const canEditInternal = !readOnly && !isGuest
  const canEditGuestReview = !readOnly && isGuest
  const [draft, setDraft] = useState(initialCaso)
  const [editing, setEditing] = useState(mode !== 'view')
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [savingCase, setSavingCase] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(initialCaso)
    setEditing(mode !== 'view')
    setEvidenceOpen(false)
  }, [open, initialCaso, mode])

  const patch = (partial: Partial<PruebaCaso>) => {
    setDraft((prev) => ({ ...prev, ...partial }))
  }

  const handleSave = async () => {
    setSavingCase(true)
    try {
      if (isGuest && onClientReview && draft.id && !draft.id.startsWith('caso-temp-')) {
        await onClientReview(draft.id, {
          clientOk: draft.clientOk ?? false,
          clientNotes: draft.clientNotes,
        })
      }
      await onSave(draft)
      onOpenChange(false)
    } finally {
      setSavingCase(false)
    }
  }

  const handleCancelEdit = () => {
    if (mode === 'view') {
      setDraft(initialCaso)
      setEditing(false)
      return
    }
    onOpenChange(false)
  }

  const internalFieldsEditable = editing && canEditInternal
  const guestClientEditable =
    editing && canEditGuestReview && canGuestEditPruebaCaseField(profile, 'clientOk')
  const guestNotesEditable =
    editing && canEditGuestReview && canGuestEditPruebaCaseField(profile, 'clientNotes')

  const caseLabel = displayPruebaCaseNumber(draft.code)
  const isViewMode = !editing && mode !== 'create'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(92dvh,56rem)] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
          <DialogHeader className="space-y-1 border-b border-border px-4 py-4 text-start sm:px-6">
            <DialogTitle className="text-base sm:text-lg">
              {mode === 'create'
                ? 'Nuevo caso de prueba'
                : isViewMode
                  ? `Ver caso ${caseLabel}`
                  : `Editar caso ${caseLabel}`}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? 'Completa la planilla del caso. Podrás agregar evidencias después de guardar la prueba.'
                : isViewMode
                  ? 'Consulta el detalle del caso. Usa Editar para modificar la información.'
                  : isGuest
                    ? 'Actualiza la revisión del cliente para este caso.'
                    : 'Modifica la planilla del caso y guarda los cambios.'}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:px-6">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Descripción</h3>
              {internalFieldsEditable ? (
                <ContactFormField label="Descripción corta">
                  <textarea
                    value={draft.shortDescription}
                    onChange={(e) => patch({ shortDescription: e.target.value })}
                    rows={2}
                    className={textareaClass}
                  />
                </ContactFormField>
              ) : (
                <ReadOnlyBlock label="Descripción corta" value={draft.shortDescription} />
              )}
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Planilla de prueba</h3>
              <div className="grid gap-4">
                {internalFieldsEditable ? (
                  <>
                    <ContactFormField label="Datos de entrada">
                      <textarea
                        value={draft.inputData}
                        onChange={(e) => patch({ inputData: e.target.value })}
                        rows={4}
                        className={textareaClass}
                      />
                    </ContactFormField>
                    <ContactFormField label="Pasos realizados">
                      <textarea
                        value={draft.steps}
                        onChange={(e) => patch({ steps: e.target.value })}
                        rows={5}
                        className={textareaClass}
                      />
                    </ContactFormField>
                    <ContactFormField label="Resultado esperado">
                      <textarea
                        value={draft.expectedResult}
                        onChange={(e) => patch({ expectedResult: e.target.value })}
                        rows={4}
                        className={textareaClass}
                      />
                    </ContactFormField>
                    <ContactFormField label="Resultado obtenido">
                      <textarea
                        value={draft.obtainedResult}
                        onChange={(e) => patch({ obtainedResult: e.target.value })}
                        rows={4}
                        className={textareaClass}
                      />
                    </ContactFormField>
                  </>
                ) : (
                  <>
                    <ReadOnlyBlock label="Datos de entrada" value={draft.inputData} />
                    <ReadOnlyBlock label="Pasos realizados" value={draft.steps} />
                    <ReadOnlyBlock label="Resultado esperado" value={draft.expectedResult} />
                    <ReadOnlyBlock label="Resultado obtenido" value={draft.obtainedResult} />
                  </>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Ejecutor</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {internalFieldsEditable ? (
                  <ContactFormCheckbox
                    id={`executor-ok-dialog-${draft.id}`}
                    label="OK ejecutor"
                    checked={draft.executorOk === true}
                    onChange={(checked) => patch({ executorOk: checked })}
                  />
                ) : (
                  <ReadOnlyBlock
                    label="OK ejecutor"
                    value={
                      draft.executorOk === true
                        ? 'Sí'
                        : draft.executorOk === false
                          ? 'No'
                          : 'Pendiente'
                    }
                  />
                )}
                {internalFieldsEditable ? (
                  <ContactFormField label="Observación ejecutor" className="sm:col-span-2">
                    <textarea
                      value={draft.executorNotes}
                      onChange={(e) => patch({ executorNotes: e.target.value })}
                      rows={3}
                      className={textareaClass}
                    />
                  </ContactFormField>
                ) : (
                  <div className="sm:col-span-2">
                    <ReadOnlyBlock label="Observación ejecutor" value={draft.executorNotes} />
                  </div>
                )}
                <ContactFormField label="Fecha OK ejecutor">
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                    {draft.executorOkAt ? formatChileDateTimeDisplay(draft.executorOkAt) : '—'}
                  </div>
                </ContactFormField>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">Evidencias</h3>
                {internalFieldsEditable ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setEvidenceOpen(true)}
                  >
                    <ImageIcon className="size-3.5" />
                    Gestionar evidencias
                  </Button>
                ) : null}
              </div>
              <PruebaCasoEvidencePreview caso={draft} />
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Cliente</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {guestClientEditable ? (
                  <ContactFormCheckbox
                    id={`client-ok-dialog-${draft.id}`}
                    label="OK cliente"
                    checked={draft.clientOk === true}
                    onChange={(checked) => patch({ clientOk: checked })}
                  />
                ) : (
                  <ReadOnlyBlock
                    label="OK cliente"
                    value={
                      draft.clientOk === true
                        ? 'Sí'
                        : draft.clientOk === false
                          ? 'No'
                          : 'Pendiente'
                    }
                  />
                )}
                {guestNotesEditable ? (
                  <ContactFormField label="Observación cliente" className="sm:col-span-2">
                    <textarea
                      value={draft.clientNotes}
                      onChange={(e) => patch({ clientNotes: e.target.value })}
                      rows={3}
                      className={textareaClass}
                    />
                  </ContactFormField>
                ) : (
                  <div className="sm:col-span-2">
                    <ReadOnlyBlock label="Observación cliente" value={draft.clientNotes} />
                  </div>
                )}
                <ContactFormField label="Fecha OK cliente">
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                    {draft.clientOkAt ? formatChileDateTimeDisplay(draft.clientOkAt) : '—'}
                  </div>
                </ContactFormField>
              </div>
            </section>
          </div>

          {isViewMode ? (
            <DialogFooter className="gap-2 border-t border-border px-4 py-4 sm:px-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              {canEditInternal ? (
                <Button type="button" className="gap-1.5" onClick={() => setEditing(true)}>
                  <Pencil className="size-4" />
                  Editar
                </Button>
              ) : null}
              {canEditGuestReview ? (
                <Button type="button" className="gap-1.5" onClick={() => setEditing(true)}>
                  <Pencil className="size-4" />
                  Editar revisión
                </Button>
              ) : null}
            </DialogFooter>
          ) : (
            <DialogFooter className="gap-2 border-t border-border px-4 py-4 sm:px-6">
              <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={savingCase || saving}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={savingCase || saving}>
                {savingCase || saving
                  ? 'Guardando…'
                  : mode === 'create'
                    ? 'Agregar caso'
                    : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <PruebaCasoEvidenceDialog
        open={evidenceOpen}
        onOpenChange={setEvidenceOpen}
        caso={draft}
        authorName={getCurrentUserName()}
        readOnly={!internalFieldsEditable}
        onSave={(html) => {
          patch({ evidenceHtml: html })
        }}
      />
    </>
  )
}
