import { Loader2, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'

import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import type { TotpSetupPayload } from '@/api/two-factor'
import {
  adminResetTwoFactorApi,
  confirmTwoFactorSetupApi,
  disableTwoFactorApi,
  fetchTwoFactorStatusApi,
  startTwoFactorSetupApi,
} from '@/api/two-factor'
import { TotpCodeInput } from '@/components/auth/TotpCodeInput'
import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserDetail } from '@/data/user-detail.mock'
import { toast } from '@/lib/toast'

type UserTwoFactorPanelProps = {
  user: UserDetail
  isSelf: boolean
  canAdminManage: boolean
  onUserUpdated?: (patch: Partial<UserDetail>) => void
}

export function UserTwoFactorPanel({
  user,
  isSelf,
  canAdminManage,
  onUserUpdated,
}: UserTwoFactorPanelProps) {
  const [statusLoading, setStatusLoading] = useState(isApiEnabled())
  const [policyEnabled, setPolicyEnabled] = useState(user.twoFactorEnabled)
  const [configured, setConfigured] = useState(user.twoFactorConfigured ?? false)
  const [setup, setSetup] = useState<TotpSetupPayload | null>(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)

  const canManage = isSelf || canAdminManage
  const userId = user.id

  useEffect(() => {
    if (!isApiEnabled()) {
      setPolicyEnabled(user.twoFactorEnabled)
      setConfigured(Boolean(user.twoFactorConfigured))
      setStatusLoading(false)
      return
    }

    let cancelled = false
    setStatusLoading(true)

    void fetchTwoFactorStatusApi(userId, isSelf)
      .then((s) => {
        if (cancelled) return
        setPolicyEnabled(s.policyEnabled)
        setConfigured(s.configured)
      })
      .catch((err) => {
        if (cancelled) return
        toast.error(apiActionErrorMessage(err, 'No se pudo cargar el estado de 2FA.'))
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId, isSelf])

  async function handleStartSetup() {
    if (!isApiEnabled()) {
      toast.warning('2FA requiere conexión con la API.')
      return
    }
    setBusy(true)
    setSetup(null)
    setBackupCodes(null)
    try {
      const data = await startTwoFactorSetupApi(user.id, isSelf)
      setSetup(data)
      setConfirmCode('')
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudo iniciar la configuración.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmSetup() {
    if (!setup || confirmCode.length < 6) {
      toast.warning('Ingresa el código de 6 dígitos.')
      return
    }
    setBusy(true)
    try {
      const result = await confirmTwoFactorSetupApi(
        user.id,
        isSelf,
        confirmCode,
        setup.setupId,
      )
      setBackupCodes(result.backupCodes)
      setSetup(null)
      setConfigured(true)
      setPolicyEnabled(true)
      onUserUpdated?.({ twoFactorEnabled: true, twoFactorConfigured: true })
      toast.success('Autenticación en dos pasos activada.')
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'Código incorrecto o configuración expirada.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleDisableSelf() {
    if (!disablePassword || disableCode.length < 6) {
      toast.warning('Indica tu contraseña y el código de la app.')
      return
    }
    setBusy(true)
    try {
      await disableTwoFactorApi(user.id, true, disablePassword, disableCode)
      setPolicyEnabled(false)
      setConfigured(false)
      setDisablePassword('')
      setDisableCode('')
      onUserUpdated?.({ twoFactorEnabled: false, twoFactorConfigured: false })
      toast.success('2FA desactivado.')
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudo desactivar 2FA.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleAdminReset() {
    if (
      !window.confirm(
        `¿Restablecer 2FA de ${user.name}? Deberá volver a escanear el código QR.`,
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await adminResetTwoFactorApi(user.id)
      setPolicyEnabled(false)
      setConfigured(false)
      setSetup(null)
      onUserUpdated?.({ twoFactorEnabled: false, twoFactorConfigured: false })
      toast.success('2FA restablecido.')
    } catch (err) {
      toast.error(apiActionErrorMessage(err, 'No se pudo restablecer 2FA.'))
    } finally {
      setBusy(false)
    }
  }

  if (!canManage && !configured) {
    return null
  }

  return (
    <Card className="border-border shadow-sm lg:col-span-2 xl:col-span-3">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Shield aria-hidden className="size-4 text-muted-foreground" />
          Autenticación en dos pasos (2FA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Cargando estado…
          </div>
        ) : (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Política (requerido)</dt>
              <dd className="font-medium">{policyEnabled ? 'Sí' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">App configurada</dt>
              <dd className="font-medium">{configured ? 'Sí' : 'Pendiente'}</dd>
            </div>
          </dl>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          Usa Google Authenticator, Microsoft Authenticator, Authy u otra app compatible con
          códigos TOTP de 6 dígitos.{' '}
          {policyEnabled && !configured
            ? 'La política está activa pero falta vincular la app.'
            : null}
        </p>

        {backupCodes ? (
          <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="text-sm font-medium text-foreground">Códigos de respaldo (guárdalos)</p>
            <ul className="grid gap-1 font-mono text-xs sm:grid-cols-2">
              {backupCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {setup ? (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start">
              <img
                src={setup.qrDataUrl}
                alt="QR autenticador"
                className="size-[180px] shrink-0 rounded-md bg-white p-1"
              />
              <div className="min-w-0 text-xs text-muted-foreground">
                <p className="mb-1">Escanea con tu app o ingresa la clave manual:</p>
                <p className="break-all font-mono font-medium text-foreground">{setup.secret}</p>
              </div>
            </div>
            <TotpCodeInput
              id="profile-totp-confirm"
              label="Código de prueba"
              value={confirmCode}
              onChange={setConfirmCode}
              disabled={busy}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={busy} onClick={() => void handleConfirmSetup()}>
                Confirmar vinculación
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => setSetup(null)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        {canManage && !setup ? (
          <div className="flex flex-wrap gap-2">
            {!configured ? (
              <Button type="button" size="sm" disabled={busy} onClick={() => void handleStartSetup()}>
                {busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
                Vincular app autenticadora
              </Button>
            ) : null}
            {canAdminManage && !isSelf && configured ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void handleAdminReset()}
              >
                Restablecer 2FA (admin)
              </Button>
            ) : null}
          </div>
        ) : null}

        {isSelf && configured && !setup ? (
          <div className="space-y-3 border-t border-border/60 pt-4">
            <p className="text-sm font-medium text-foreground">Desactivar 2FA</p>
            <ContactFormInput
              id="disable-2fa-password"
              label="Tu contraseña"
              type="password"
              value={disablePassword}
              onChange={setDisablePassword}
              disabled={busy}
            />
            <TotpCodeInput
              id="disable-2fa-code"
              label="Código actual o de respaldo"
              value={disableCode}
              onChange={setDisableCode}
              disabled={busy}
            />
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => void handleDisableSelf()}
            >
              Desactivar 2FA
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
