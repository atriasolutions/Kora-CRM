import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { BitacoraFormFields } from '@/components/bitacora/BitacoraFormFields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiActionErrorMessage } from '@/api/errors'
import {
  createDefaultBitacoraFormValues,
  prepareBitacoraFormForSubmit,
  validateBitacoraForm,
  type BitacoraFormValues,
} from '@/lib/bitacora-form'

type CreateBitacoraDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  initialValues?: Partial<BitacoraFormValues>
  lockSolicitud?: boolean
  onSubmit: (values: BitacoraFormValues) => void | Promise<void>
}

export function CreateBitacoraDialog({
  open,
  onOpenChange,
  title = 'Nueva bitácora',
  description = 'Registre las horas invertidas en una solicitud.',
  initialValues,
  lockSolicitud = false,
  onSubmit,
}: CreateBitacoraDialogProps) {
  const [form, setForm] = useState(() => createDefaultBitacoraFormValues(initialValues))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(createDefaultBitacoraFormValues(initialValues))
      setSubmitting(false)
    })
  }, [open, initialValues])

  const patch = (partial: Partial<BitacoraFormValues>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const prepared = prepareBitacoraFormForSubmit(form)
    const validation = validateBitacoraForm(prepared)
    if (validation) {
      toast.warning(validation)
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(prepared)
      onOpenChange(false)
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo registrar la bitácora.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="w-full min-w-0 space-y-4" onSubmit={handleSubmit}>
          <BitacoraFormFields
            form={form}
            onChange={patch}
            idPrefix="bitacora-create"
            lockSolicitud={lockSolicitud}
            disabled={submitting}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Registrar bitácora'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
