import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiActionErrorMessage } from '@/api/errors'
import {
  destroyTenantApi,
  getTenantAdminMetaApi,
  truncateTenantRecordsApi,
  type TenantAdminMetaDto,
} from '@/api/tenant-quotas'
import { isApiEnabled } from '@/api/config'
import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { clearAuthSession } from '@/lib/auth-session'
import { toast } from '@/lib/toast'

type DangerAction = 'truncate' | 'destroy'

function DangerConfirmDialog({
  open,
  action,
  meta,
  onOpenChange,
  onConfirm,
  confirming,
}: {
  open: boolean
  action: DangerAction | null
  meta: TenantAdminMetaDto | null
  onOpenChange: (open: boolean) => void
  onConfirm: (confirmSlug: string) => Promise<void>
  confirming: boolean
}) {
  const [confirmSlug, setConfirmSlug] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => {
    if (!open) {
      setConfirmSlug('')
      setAcknowledged(false)
    }
  }, [open])

  const slugMatches =
    meta != null && confirmSlug.trim().toLowerCase() === meta.slug.trim().toLowerCase()
  const canConfirm = slugMatches && acknowledged && !confirming

  const copy =
    action === 'destroy'
      ? {
          title: 'Eliminar la instancia por completo',
          lead: 'Esta acción es permanente e irreversible.',
          bullets: [
            'Se borrarán todos los registros del CRM (contactos, empresas, ventas, proyectos, archivos, etc.).',
            'Se eliminarán usuarios que solo pertenezcan a esta instancia.',
            'Se quitarán membresías, perfiles, bodegas, configuración y la fila del tenant.',
            'El subdominio dejará de existir; no hay forma de recuperar la información.',
          ],
          confirmLabel: 'Eliminar instancia',
        }
      : {
          title: 'Vaciar todos los registros de la instancia',
          lead: 'Esta acción es permanente e irreversible.',
          bullets: [
            'Se borrarán todos los registros operacionales del CRM y archivos adjuntos.',
            'Se mantendrán usuarios, perfiles, membresías, cuotas y configuración base de la instancia.',
            'Los usuarios activos podrán seguir ingresando, pero el CRM quedará vacío.',
            'No existe copia de seguridad automática ni papelera para recuperar estos datos.',
          ],
          confirmLabel: 'Vaciar registros',
        }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle aria-hidden className="size-5 shrink-0" />
            {copy.title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1 text-left text-sm text-muted-foreground">
              <p className="font-medium text-destructive">{copy.lead}</p>
              <ul className="list-disc space-y-1.5 ps-4">
                {copy.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {meta ? (
                <p>
                  Instancia:{' '}
                  <strong className="text-foreground">{meta.displayName}</strong> (
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">{meta.slug}</code>)
                </p>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4 rounded border-border"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <span>
              Entiendo que esta operación no se puede deshacer y que perderé los datos indicados.
            </span>
          </label>

          <ContactFormInput
            id="tenant-danger-confirm-slug"
            label={`Escribe «${meta?.slug ?? '…'}» para confirmar`}
            value={confirmSlug}
            onChange={setConfirmSlug}
            placeholder={meta?.slug ?? ''}
            disabled={confirming}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={confirming} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canConfirm}
            onClick={() => void onConfirm(confirmSlug.trim())}
          >
            {confirming ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Procesando…
              </>
            ) : (
              copy.confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TenantDangerZonePanel() {
  const [meta, setMeta] = useState<TenantAdminMetaDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogAction, setDialogAction] = useState<DangerAction | null>(null)
  const [confirming, setConfirming] = useState(false)

  const load = useCallback(async () => {
    if (!isApiEnabled()) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await getTenantAdminMetaApi()
      setMeta(data)
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo cargar la información de la instancia.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const protectedMessage = useMemo(() => {
    if (!meta?.isProtected) return null
    return 'La instancia principal de la plataforma (Atria) no puede vaciarse ni eliminarse desde esta pantalla.'
  }, [meta?.isProtected])

  const handleConfirm = async (confirmSlug: string) => {
    if (!dialogAction) return
    setConfirming(true)
    try {
      if (dialogAction === 'truncate') {
        await truncateTenantRecordsApi(confirmSlug)
        toast.success('Registros de la instancia eliminados. Vuelve a iniciar sesión.')
        setDialogAction(null)
        clearAuthSession()
        window.location.href = '/login'
        return
      }

      const result = await destroyTenantApi(confirmSlug)
      toast.success(`Instancia «${result.displayName}» eliminada.`)
      setDialogAction(null)
      clearAuthSession()
      window.location.href = '/login'
    } catch (error) {
      toast.error(apiActionErrorMessage(error, 'No se pudo completar la operación.'))
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 aria-hidden className="size-4 animate-spin" />
        Cargando zona de administración…
      </div>
    )
  }

  if (!meta) return null

  const actionsDisabled = meta.isProtected || confirming

  return (
    <>
      <Card className="border-destructive/40 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle aria-hidden className="size-4" />
            Zona de peligro
          </CardTitle>
          <CardDescription>
            Acciones irreversibles sobre la instancia{' '}
            <strong className="text-foreground">{meta.displayName}</strong> (
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{meta.slug}</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {protectedMessage ? (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-muted-foreground">
              {protectedMessage}
            </p>
          ) : (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              No hay respaldo automático ni recuperación. Antes de continuar, asegúrate de que
              realmente deseas borrar datos de producción.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/80 p-4">
              <p className="text-sm font-medium text-foreground">Vaciar registros</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Elimina contactos, empresas, oportunidades, proyectos, archivos y demás registros
                operacionales. Conserva usuarios, perfiles y límites de la instancia.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={actionsDisabled}
                onClick={() => setDialogAction('truncate')}
              >
                <Trash2 aria-hidden className="size-4" />
                Vaciar registros…
              </Button>
            </div>

            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">Eliminar instancia</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Borra la instancia completa, incluido el tenant, membresías y usuarios exclusivos.
                El subdominio dejará de funcionar.
              </p>
              <Button
                type="button"
                variant="destructive"
                className="mt-3"
                disabled={actionsDisabled}
                onClick={() => setDialogAction('destroy')}
              >
                <Trash2 aria-hidden className="size-4" />
                Eliminar instancia…
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DangerConfirmDialog
        open={dialogAction != null}
        action={dialogAction}
        meta={meta}
        confirming={confirming}
        onOpenChange={(open) => {
          if (!open && !confirming) setDialogAction(null)
        }}
        onConfirm={handleConfirm}
      />
    </>
  )
}
