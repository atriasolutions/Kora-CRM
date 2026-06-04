import { Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'

type ContactEditBannerProps = {
  onCancel: () => void
  onSave: () => void
  saving?: boolean
  error?: string | null
}

export function ContactEditBanner({
  onCancel,
  onSave,
  saving = false,
  error = null,
}: ContactEditBannerProps) {
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Pencil aria-hidden className="size-4" />
          </span>
          <div>
            <p className="font-medium text-foreground">Modo edición</p>
            <p className="text-xs text-muted-foreground">
              Los cambios se guardan en esta sesión (demo). Luego se enviarán a tu API.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-border bg-card"
            disabled={saving}
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button type="button" size="sm" disabled={saving} onClick={onSave}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
