import {
  AlertCircle,
  BarChart3,
  Loader2,
  Shield,
  Sparkles,
  Target,
  Users,
  WifiOff,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { LoginBackground } from '@/components/auth/LoginBackground'
import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { KoraLogoMark } from '@/components/layout/KoraLogoMark'
import { LoginTwoFactorFlow } from '@/components/auth/LoginTwoFactorFlow'
import { useAuth } from '@/hooks/use-auth'
import { CONNECTION_TITLE, isLoginConnectionError } from '@/lib/login-errors'
import { getPostLoginRedirect } from '@/lib/auth-routes'
import { cn } from '@/lib/utils'

const HIGHLIGHTS = [
  {
    icon: Target,
    title: 'Pipeline comercial',
    description: 'Oportunidades, cotizaciones y seguimiento en un solo lugar.',
  },
  {
    icon: Users,
    title: 'Relaciones B2B y B2C',
    description: 'Contactos, empresas y actividades conectadas.',
  },
  {
    icon: BarChart3,
    title: 'Visión del negocio',
    description: 'Dashboard, inventario y reportes en tiempo real.',
  },
] as const

function LoginFormAlert({ message }: { message: string }) {
  const isConnection = isLoginConnectionError(message)

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'rounded-lg border px-3.5 py-3 text-sm',
        isConnection
          ? 'border-border bg-muted/60 text-foreground'
          : 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      <div className="flex gap-2.5">
        {isConnection ? (
          <WifiOff aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
        )}
        <div>
          <p className="font-medium">
            {isConnection ? CONNECTION_TITLE : 'No se pudo iniciar sesión'}
          </p>
          <p
            className={cn(
              'mt-1 leading-relaxed',
              isConnection ? 'text-muted-foreground' : '',
            )}
          >
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isReady, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [twoFactorStep, setTwoFactorStep] = useState<
    | { mode: 'verify'; challengeId: string; userEmail: string }
    | { mode: 'enroll'; enrollmentToken: string; userEmail: string }
    | null
  >(null)
  const [backupCodesNotice, setBackupCodesNotice] = useState<string[] | null>(null)

  if (!isReady) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={getPostLoginRedirect(location.state)} replace />
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const outcome = await login(email.trim(), password)
      if (outcome.status === 'error') {
        setError(outcome.message)
        return
      }
      if (outcome.status === 'verify') {
        setTwoFactorStep({
          mode: 'verify',
          challengeId: outcome.challengeId,
          userEmail: outcome.userEmail,
        })
        return
      }
      if (outcome.status === 'enroll') {
        setTwoFactorStep({
          mode: 'enroll',
          enrollmentToken: outcome.enrollmentToken,
          userEmail: outcome.userEmail,
        })
        return
      }
      navigate(getPostLoginRedirect(location.state), { replace: true })
    } finally {
      setLoading(false)
    }
  }

  function handleTwoFactorSuccess(backupCodes?: string[]) {
    if (backupCodes?.length) {
      setBackupCodesNotice(backupCodes)
      return
    }
    navigate(getPostLoginRedirect(location.state), { replace: true })
  }

  return (
    <div className="relative flex min-h-svh overflow-hidden bg-background">
      <LoginBackground />

      <div className="relative z-10 flex w-full flex-col lg:flex-row">
        <section
          className={cn(
            'hidden flex-1 flex-col justify-between border-e border-border/50 bg-card/40 p-10 xl:p-14 lg:flex',
          )}
        >
          <KoraLogoMark size="lg" align="start" />

          <div className="max-w-md space-y-8 py-12">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                <Sparkles aria-hidden className="size-3.5" />
                Bienvenido de nuevo
              </p>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground xl:text-4xl">
                Tu operación comercial,
                <span className="text-primary"> en un solo lugar</span>
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground">
                Centraliza ventas, compras, inventario y equipos con una experiencia
                pensada para equipos que necesitan claridad y velocidad.
              </p>
            </div>

            <ul className="space-y-3">
              {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
                <li
                  key={title}
                  className="flex gap-4 rounded-xl border border-border/70 bg-background/80 p-4"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield aria-hidden className="size-3.5 shrink-0 text-primary/80" />
            Acceso seguro con permisos por perfil
          </p>
        </section>

        <section className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8 lg:max-w-xl lg:px-12">
          <div className="mb-8 flex w-full max-w-md justify-center lg:hidden">
            <KoraLogoMark size="md" align="center" />
          </div>

          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            <div className="border-b border-border px-6 py-5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {twoFactorStep
                  ? twoFactorStep.mode === 'enroll'
                    ? 'Configurar 2FA'
                    : 'Verificación en dos pasos'
                  : backupCodesNotice
                    ? 'Códigos de respaldo'
                    : 'Iniciar sesión'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {backupCodesNotice
                  ? 'Guárdalos en un lugar seguro; cada uno solo sirve una vez.'
                  : twoFactorStep
                    ? 'Google Authenticator, Microsoft Authenticator u otra app TOTP'
                    : 'Accede al CRM con tus credenciales corporativas'}
              </p>
            </div>

            <div className="px-6 py-6">
              {backupCodesNotice ? (
                <div className="space-y-4">
                  <ul className="grid gap-2 rounded-lg border border-border bg-muted/40 p-4 font-mono text-sm">
                    {backupCodesNotice.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() =>
                      navigate(getPostLoginRedirect(location.state), { replace: true })
                    }
                  >
                    Continuar al CRM
                  </Button>
                </div>
              ) : twoFactorStep ? (
                <LoginTwoFactorFlow
                  mode={twoFactorStep.mode}
                  challengeId={
                    twoFactorStep.mode === 'verify' ? twoFactorStep.challengeId : undefined
                  }
                  enrollmentToken={
                    twoFactorStep.mode === 'enroll'
                      ? twoFactorStep.enrollmentToken
                      : undefined
                  }
                  userEmail={twoFactorStep.userEmail}
                  onSuccess={handleTwoFactorSuccess}
                  onBack={() => {
                    setTwoFactorStep(null)
                    setError(null)
                  }}
                />
              ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <ContactFormInput
                  id="login-email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  required
                />
                <ContactFormInput
                  id="login-password"
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  required
                />

                {error ? <LoginFormAlert message={error} /> : null}

                <div className="flex justify-end">
                  <Link
                    to="/olvide-contraseña"
                    className="text-sm text-primary underline-offset-2 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : null}
                  {loading ? 'Ingresando…' : 'Ingresar'}
                </Button>
              </form>
              )}
            </div>
          </div>

          <p className="mt-6 max-w-md text-center text-xs text-muted-foreground">
            ¿Primera vez? Revisa el correo de bienvenida para activar tu cuenta.
          </p>
        </section>
      </div>
    </div>
  )
}
