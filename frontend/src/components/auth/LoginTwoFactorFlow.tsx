import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { enrollmentSetupApi } from '@/api/two-factor'
import type { TotpSetupPayload } from '@/api/two-factor'
import { TotpCodeInput } from '@/components/auth/TotpCodeInput'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

type LoginTwoFactorFlowProps = {
  mode: 'verify' | 'enroll'
  challengeId?: string
  enrollmentToken?: string
  userEmail: string
  onSuccess: (backupCodes?: string[]) => void
  onBack: () => void
}

export function LoginTwoFactorFlow({
  mode,
  challengeId,
  enrollmentToken,
  userEmail,
  onSuccess,
  onBack,
}: LoginTwoFactorFlowProps) {
  const { completeTwoFactorLogin, completeEnrollmentLogin } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [setup, setSetup] = useState<TotpSetupPayload | null>(null)
  const [setupLoading, setSetupLoading] = useState(mode === 'enroll')

  useEffect(() => {
    if (mode !== 'enroll' || !enrollmentToken) return
    let cancelled = false
    void enrollmentSetupApi(enrollmentToken)
      .then((data) => {
        if (!cancelled) setSetup(data)
      })
      .catch(() => {
        if (!cancelled) {
          setError('No se pudo cargar la configuración. Vuelve a iniciar sesión.')
        }
      })
      .finally(() => {
        if (!cancelled) setSetupLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode, enrollmentToken])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (code.length < 6) {
      setError('Ingresa el código de 6 dígitos de tu app autenticadora.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'verify' && challengeId) {
        const result = await completeTwoFactorLogin(challengeId, code)
        if (result.status === 'error') {
          setError(result.message)
          return
        }
        onSuccess()
        return
      }
      if (mode === 'enroll' && enrollmentToken) {
        const result = await completeEnrollmentLogin(
          enrollmentToken,
          code,
          setup?.setupId,
        )
        if (result.status === 'error') {
          setError(result.message)
          return
        }
        onSuccess(result.backupCodes)
        return
      }
      setError('Sesión inválida. Vuelve a iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <p className="text-sm text-muted-foreground">
        {mode === 'enroll' ? (
          <>
            Tu cuenta requiere autenticación en dos pasos. Escanea el código con{' '}
            <strong className="font-medium text-foreground">Google Authenticator</strong>{' '}
            u otra app compatible, luego ingresa el código de 6 dígitos.
          </>
        ) : (
          <>
            Ingresa el código de tu app autenticadora para{' '}
            <strong className="font-medium text-foreground">{userEmail}</strong>.
          </>
        )}
      </p>

      {mode === 'enroll' && setupLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
        </div>
      ) : null}

      {mode === 'enroll' && setup ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <img
            src={setup.qrDataUrl}
            alt="Código QR para app autenticadora"
            className="size-[220px] rounded-md bg-white p-1"
          />
          <p className="text-center text-xs text-muted-foreground">
            Clave manual:{' '}
            <span className="font-mono font-medium text-foreground">{setup.secret}</span>
          </p>
        </div>
      ) : null}

      <TotpCodeInput
        id="login-totp-code"
        value={code}
        onChange={setCode}
        disabled={loading || (mode === 'enroll' && setupLoading)}
        autoFocus={mode === 'verify'}
      />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={loading || (mode === 'enroll' && !setup)}
      >
        {loading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
        {loading ? 'Verificando…' : mode === 'enroll' ? 'Activar y entrar' : 'Verificar'}
      </Button>

      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
        Volver al inicio de sesión
      </Button>
    </form>
  )
}
