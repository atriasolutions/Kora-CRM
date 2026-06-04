import { useEffect, useState } from 'react'

import { ContactFormField, ContactFormInput } from '@/components/contacts/ContactFormField'
import { WorkboardAssigneesField } from '@/components/projects/workboard/WorkboardAssigneesField'
import { WorkboardStatusCell } from '@/components/projects/workboard/WorkboardStatusCell'
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
  applyWorkItemDateChange,
  parseWorkboardHoursInput,
  validateWorkItemDates,
  type WorkItemDateField,
} from '@/lib/project-work-plan'
import { toast } from '@/lib/toast'
import type { ProjectWorkItem } from '@/types/project-work-plan'

type ProjectWorkItemDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ProjectWorkItem | null
  isSubActivity: boolean
  onSave: (item: ProjectWorkItem) => void
  onDelete?: () => void
}

export function ProjectWorkItemDialog({
  open,
  onOpenChange,
  item,
  isSubActivity,
  onSave,
  onDelete,
}: ProjectWorkItemDialogProps) {
  const [draft, setDraft] = useState<ProjectWorkItem | null>(item)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => setDraft(item))
  }, [open, item])

  if (!draft) return null

  const patch = (partial: Partial<ProjectWorkItem>) => {
    setDraft((prev) => (prev ? { ...prev, ...partial } : prev))
  }

  const patchDate = (field: WorkItemDateField, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev
      const result = applyWorkItemDateChange(prev, field, value)
      if ('error' in result) {
        toast.warning(result.error)
        return prev
      }
      return result.item
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isSubActivity ? 'Subactividad' : 'Actividad'} — {draft.name || 'Sin nombre'}
          </DialogTitle>
          <DialogDescription>
            El avance del proyecto se calcula por estado (Completado). Las horas son solo
            referencia de esfuerzo planificado vs. registrado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ContactFormInput
            id="wi-name"
            label="Nombre"
            value={draft.name}
            onChange={(name) => patch({ name })}
          />
          <ContactFormField id="wi-desc" label="Descripción">
            <textarea
              id="wi-desc"
              rows={3}
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </ContactFormField>
          <WorkboardAssigneesField
            id="wi-assignees"
            assignees={draft.assignees}
            onChange={(assignees) => patch({ assignees })}
          />
          <ContactFormField id="wi-status" label="Estado">
            <WorkboardStatusCell
              status={draft.status}
              onChange={(status) => patch({ status })}
            />
          </ContactFormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <ContactFormInput
              id="wi-est-h"
              label="Estimación (horas)"
              type="number"
              value={String(draft.estimatedHours)}
              onChange={(v) => patch({ estimatedHours: parseWorkboardHoursInput(String(v)) })}
            />
            <ContactFormInput
              id="wi-act-h"
              label="Horas reales"
              type="number"
              value={String(draft.actualHours)}
              onChange={(v) => patch({ actualHours: parseWorkboardHoursInput(String(v)) })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ContactFormInput
              id="wi-est-start"
              label="Inicio estimado"
              type="date"
              value={draft.estimatedStart}
              onChange={(v) => patchDate('estimatedStart', v)}
            />
            <ContactFormInput
              id="wi-est-end"
              label="Fin estimado"
              type="date"
              value={draft.estimatedEnd}
              onChange={(v) => patchDate('estimatedEnd', v)}
            />
            <ContactFormInput
              id="wi-act-start"
              label="Inicio real"
              type="date"
              value={draft.actualStart}
              onChange={(v) => patchDate('actualStart', v)}
            />
            <ContactFormInput
              id="wi-act-end"
              label="Fin real"
              type="date"
              value={draft.actualEnd}
              onChange={(v) => patchDate('actualEnd', v)}
            />
          </div>
          <ContactFormField id="wi-comment" label="Comentario / avance">
            <textarea
              id="wi-comment"
              rows={3}
              placeholder="Ej. Bloqueado por acceso VPN del cliente…"
              value={draft.comment}
              onChange={(e) => patch({ comment: e.target.value })}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </ContactFormField>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {onDelete ? (
            <Button type="button" variant="outline" className="text-destructive" onClick={onDelete}>
              Eliminar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                const dateError = validateWorkItemDates(draft)
                if (dateError) {
                  toast.warning(dateError)
                  return
                }
                onSave(draft)
                onOpenChange(false)
              }}
            >
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
