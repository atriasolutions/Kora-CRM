import { BellRing, Loader2, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'

import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  disableWebPush,
  enableWebPush,
  getActivePushSubscription,
  getNotificationPermission,
  isAndroidMobilePushClient,
  isWebPushSupported,
} from '@/lib/web-push'
import { toast } from '@/lib/toast'

type UserWebPushPanelProps = {
  isSelf: boolean
}

export function UserWebPushPanel({ isSelf }: UserWebPushPanelProps) {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [permission, setPermission] = useState(getNotificationPermission())
  const [subscribed, setSubscribed] = useState(false)
  const isAndroid = typeof navigator !== 'undefined' && isAndroidMobilePushClient()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      setPermission(getNotificationPermission())
      if (!isAndroid || !isWebPushSupported() || !isApiEnabled()) {
        if (!cancelled) {
          setSubscribed(false)
          setLoading(false)
        }
        return
      }
      const sub = await getActivePushSubscription()
      if (!cancelled) {
        setSubscribed(Boolean(sub))
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAndroid])

  if (!isSelf) return null

  const unsupported = !isWebPushSupported()
  const denied = permission === 'denied'

  async function handleEnable() {
    setBusy(true)
    try {
      await enableWebPush()
      setPermission('granted')
      setSubscribed(true)
      toast.success('Notificaciones push activadas en este celular.')
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudieron activar las notificaciones push.'))
      setPermission(getNotificationPermission())
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    setBusy(true)
    try {
      await disableWebPush()
      setSubscribed(false)
      toast.success('Notificaciones push desactivadas en este celular.')
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudieron desactivar las notificaciones push.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing aria-hidden className="size-4 text-primary" />
          Notificaciones push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          Avisos en tu celular Android aunque Kora esté cerrado (menciones, asignaciones, stock,
          etc.). Solo se activan desde el teléfono.
        </p>

        {!isAndroid ? (
          <div className="flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-foreground">
            <Smartphone aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Abre Kora en <strong className="font-medium">Android</strong> (Chrome o la app
              instalada) y activa las notificaciones ahí. Desde el computador web no se envían
              push al celular.
            </p>
          </div>
        ) : loading ? (
          <p className="inline-flex items-center gap-2 text-muted-foreground">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Comprobando estado…
          </p>
        ) : unsupported ? (
          <p className="text-amber-700 dark:text-amber-300">
            Este navegador no soporta Web Push. Prueba con Chrome actualizado.
          </p>
        ) : denied ? (
          <p className="text-amber-700 dark:text-amber-300">
            Bloqueaste las notificaciones. Actívalas en Ajustes del celular → Apps → Chrome (o
            Kora) → Notificaciones.
          </p>
        ) : subscribed ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-foreground">Activas en este celular.</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || !isApiEnabled()}
              onClick={() => void handleDisable()}
            >
              {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              Desactivar
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy || !isApiEnabled()}
              onClick={() => void handleEnable()}
            >
              {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              Activar en este celular
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
