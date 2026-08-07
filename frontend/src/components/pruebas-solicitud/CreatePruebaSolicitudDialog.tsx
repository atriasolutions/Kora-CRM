import { useEffect, useState } from 'react'

import { SolicitudLookupField } from '@/components/shared/SolicitudLookupField'
import { ContactFormField } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  createDefaultPruebaFormValues,
  type PruebaSolicitudFormValues,
} from '@/lib/prueba-solicitud-form'

type CreatePruebaSolicitudDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: PruebaSolicitudFormValues) => Promise<void>
  initialValues?: Partial<PruebaSolicitudFormValues>
}

export function CreatePruebaSolicitudDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: CreatePruebaSolicitudDialogProps) {
  const [form, setForm] = useState(() => createDefaultPruebaFormValues(initialValues))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(createDefaultPruebaFormValues(initialValues))
    }
  }, [open, initialValues])

  const patch = (partial: Partial<PruebaSolicitudFormValues>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const handleSubmit = async () => {
    if (!form.solicitudId.trim()) return
    setSaving(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
      setForm(createDefaultPruebaFormValues(initialValues))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva prueba de solicitud</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <ContactFormField label="Solicitud">
            <SolicitudLookupField
              value={form.solicitudId}
              solicitudCode={form.solicitudCode}
              solicitudTitle={form.solicitudTitle}
              onChange={(solicitudId, meta) =>
                patch({
                  solicitudId,
                  solicitudCode: meta?.code ?? '',
                  solicitudTitle: meta?.title ?? '',
                })
              }
              disabled={Boolean(initialValues?.solicitudId)}
              hideHelper
            />
          </ContactFormField>
          <ContactFormField label="Descripción">
            <textarea
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </ContactFormField>
          <ContactFormField label="Fecha ejecución">
            <input
              type="date"
              value={form.executedAt}
              onChange={(e) => patch({ executedAt: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </ContactFormField>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={saving || !form.solicitudId}>
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
