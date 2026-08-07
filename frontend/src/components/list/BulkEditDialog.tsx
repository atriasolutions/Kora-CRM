import { useEffect, useMemo, useState } from 'react'

import {
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export type BulkEditFieldOption = {
  value: string
  label: string
}

export type BulkEditFieldDef = {
  key: string
  label: string
  /** Si se define, se muestra un select; si no, input de texto. */
  options?: BulkEditFieldOption[]
  placeholder?: string
}

type BulkEditDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  selectedCount: number
  fields: BulkEditFieldDef[]
  saving?: boolean
  onSubmit: (patch: Record<string, string>) => void | Promise<void>
}

/**
 * Edición masiva: solo se envían los campos donde el usuario escribió/eligió un valor.
 * Campos vacíos se omiten (no se borran datos).
 */
export function BulkEditDialog({
  open,
  onOpenChange,
  title = 'Editar seleccionados',
  description,
  selectedCount,
  fields,
  saving = false,
  onSubmit,
}: BulkEditDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) setValues({})
  }, [open])

  const patch = useMemo(() => {
    const next: Record<string, string> = {}
    for (const field of fields) {
      const raw = values[field.key]
      if (raw == null) continue
      const trimmed = raw.trim()
      if (!trimmed) continue
      next[field.key] = trimmed
    }
    return next
  }, [fields, values])

  const canSubmit = Object.keys(patch).length > 0 && selectedCount > 0 && !saving

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ??
              `Se actualizarán ${selectedCount} registro${selectedCount === 1 ? '' : 's'}. Solo se aplican los campos que completes; el resto no cambia.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {fields.map((field) =>
            field.options ? (
              <ContactFormSelect
                key={field.key}
                id={`bulk-${field.key}`}
                label={field.label}
                value={values[field.key] ?? ''}
                onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
                options={[
                  { value: '', label: 'Sin cambiar' },
                  ...field.options,
                ]}
              />
            ) : (
              <ContactFormInput
                key={field.key}
                id={`bulk-${field.key}`}
                label={field.label}
                inputVariant="alphanumeric"
                value={values[field.key] ?? ''}
                onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
                placeholder={field.placeholder ?? 'Sin cambiar'}
              />
            ),
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => void onSubmit(patch)}
          >
            {saving ? 'Guardando…' : 'Aplicar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
