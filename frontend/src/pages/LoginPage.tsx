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
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { identifyTenantsApi, type TenantMembershipOption } from '@/api/auth'
import { LoginAtriaCredit } from '@/components/auth/LoginAtriaCredit'
import { LoginBackground } from '@/components/auth/LoginBackground'
import { LoginTenantLogo, LoginTenantPicker } from '@/components/auth/LoginTenantPicker'
import { MarketingHeader } from '@/components/marketing/MarketingHeader'
import { MarketingScrollContext } from '@/components/marketing/marketing-scroll-context'
import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { KoraLogoMark } from '@/components/layout/KoraLogoMark'
import { LoginTwoFactorFlow } from '@/components/auth/LoginTwoFactorFlow'
import { useAuth } from '@/hooks/use-auth'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useTenantBranding } from '@/hooks/use-tenant-branding'
import { CONNECTION_TITLE, isLoginConnectionError } from '@/lib/login-errors'
import { getPostLoginRedirect } from '@/lib/auth-routes'
import {
  PLATFORM_PRIVACY_POLICY_PATH,
  PLATFORM_TERMS_PATH,
} from '@/lib/platform-legal'
import { loadAuthSession, saveAuthSession } from '@/lib/auth-session'
import { isCentralAppHost, resolveTenantSlugFromHostname, tenantAppOrigin } from '@/lib/tenant-host'
import { marketingTheme } from '@/lib/marketing-theme'
import { cn } from '@/lib/utils'

const HIGHLIGHTS = [
  {
    icon: Target,
    title: 'Pipeline comercial',
    description: 'Oportunidades, cotizaciones y seguimiento unificado.',
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
        'rounded-xl border px-3.5 py-3 text-sm',
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

function LoginFormCard({
  twoFactorStep,
  backupCodesNotice,
  loading,
  error,
  email,
  password,
  setEmail,
  setPassword,
  setError,
  setTwoFactorStep,
  handleSubmit,
  handleTwoFactorSuccess,
  onContinueAfterBackup,
  navigate,
  locationState,
  tenantDisplayName,
  tenantLogoUrl,
  memberships,
  selectedTenantId,
  setSelectedTenantId,
  showTenantField,
}: {
  twoFactorStep:
    | { mode: 'verify'; challengeId: string; userEmail: string; tenantId: string }
    | { mode: 'enroll'; enrollmentToken: string; userEmail: string; tenantId: string }
    | null
  backupCodesNotice: string[] | null
  loading: boolean
  error: string | null
  email: string
  password: string
  setEmail: (v: string) => void
  setPassword: (v: string) => void
  setError: (v: string | null) => void
  setTwoFactorStep: React.Dispatch<
    React.SetStateAction<
      | { mode: 'verify'; challengeId: string; userEmail: string; tenantId: string }
      | { mode: 'enroll'; enrollmentToken: string; userEmail: string; tenantId: string }
      | null
    >
  >
  handleSubmit: (event: React.FormEvent) => void
  handleTwoFactorSuccess: (backupCodes?: string[]) => void
  onContinueAfterBackup: () => void
  navigate: ReturnType<typeof useNavigate>
  locationState: unknown
  tenantDisplayName: string
  tenantLogoUrl?: string
  memberships: TenantMembershipOption[]
  selectedTenantId: string
  setSelectedTenantId: (v: string) => void
  showTenantField: boolean
}) {
  const title = twoFactorStep
    ? twoFactorStep.mode === 'enroll'
      ? 'Configurar 2FA'
      : 'Verificación en dos pasos'
    : backupCodesNotice
      ? 'Códigos de respaldo'
      : 'Iniciar sesión'

  const subtitle = backupCodesNotice
    ? 'Guárdalos en un lugar seguro; cada uno solo sirve una vez.'
    : twoFactorStep
      ? 'Google Authenticator, Microsoft Authenticator u otra app TOTP'
      : 'Accede con tus credenciales corporativas'

  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_24px_64px_-28px_rgba(15,23,42,0.22)] backdrop-blur-sm">
      <div className="h-1 bg-gradient-to-r from-violet-600 via-primary to-cyan-500" aria-hidden />
      <div className="px-7 py-6 sm:px-8 sm:py-7">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>

        <div className="mt-6">
          {!twoFactorStep && !backupCodesNotice ? (
            <LoginTenantLogo displayName={tenantDisplayName} logoUrl={tenantLogoUrl} />
          ) : null}
          {backupCodesNotice ? (
            <div className="space-y-4">
              <ul className="grid gap-2 rounded-xl border border-border bg-muted/40 p-4 font-mono text-sm">
                {backupCodesNotice.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <Button
                type="button"
                className="h-11 w-full text-base font-semibold"
                onClick={onContinueAfterBackup}
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
              tenantId={twoFactorStep.tenantId}
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
              <div
                className={
                  showTenantField && memberships.length > 1 ? 'min-h-[4.5rem]' : undefined
                }
              >
                <LoginTenantPicker
                  memberships={memberships}
                  value={selectedTenantId}
                  onChange={setSelectedTenantId}
                />
              </div>
              <ContactFormInput
                id="login-password"
                label="Contraseña"
                type="password"
                value={password}
                onChange={setPassword}
                required
              />

              {error ? <LoginFormAlert message={error} /> : null}

              <div className="flex justify-end pt-0.5">
                <Link
                  to="/olvide-contraseña"
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <Button
                type="submit"
                className="h-11 w-full bg-gradient-to-r from-violet-600 via-primary to-primary text-base font-semibold shadow-md shadow-primary/25 hover:opacity-95"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : null}
                {loading ? 'Ingresando…' : 'Ingresar'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export function LoginPage() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isReady, login, session } = useAuth()
  const { tenant, isCentral, logoUrl, displayName } = useTenantBranding()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [memberships, setMemberships] = useState<TenantMembershipOption[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [loginBranding, setLoginBranding] = useState({ displayName: 'Kora CRM', logoUrl: '' })
  const debouncedEmail = useDebouncedValue(email.trim(), 450)
  const [twoFactorStep, setTwoFactorStep] = useState<
    | { mode: 'verify'; challengeId: string; userEmail: string; tenantId: string }
    | { mode: 'enroll'; enrollmentToken: string; userEmail: string; tenantId: string }
    | null
  >(null)
  const [backupCodesNotice, setBackupCodesNotice] = useState<string[] | null>(null)

  useEffect(() => {
    if (!isCentral) {
      if (tenant?.id) setSelectedTenantId(tenant.id)
      return
    }
    if (!debouncedEmail.includes('@')) {
      setMemberships([])
      setSelectedTenantId('')
      setLoginBranding({ displayName: 'Kora CRM', logoUrl: '' })
      return
    }
    let cancelled = false
    void identifyTenantsApi(debouncedEmail)
      .then((list) => {
        if (cancelled) return
        setMemberships(list)
        setSelectedTenantId((prev) => {
          if (prev && list.some((m) => m.tenantId === prev)) return prev
          return list.find((m) => m.isDefault)?.tenantId ?? list[0]?.tenantId ?? ''
        })
      })
      .catch(() => {
        if (!cancelled) {
          setMemberships([])
          setSelectedTenantId('')
        }
      })
    return () => {
      cancelled = true
    }
  }, [debouncedEmail, isCentral, tenant?.id])

  const activeMembership = memberships.find((m) => m.tenantId === selectedTenantId)

  useEffect(() => {
    if (!isCentral) return
    if (activeMembership) {
      setLoginBranding({
        displayName: activeMembership.displayName,
        logoUrl: activeMembership.logoUrl ?? '',
      })
    }
  }, [activeMembership, isCentral])

  function resolveTenantSlug(): string | undefined {
    if (!isCentral) return tenant?.slug ?? undefined
    return memberships.find((m) => m.tenantId === selectedTenantId)?.slug
  }

  function redirectAfterLogin() {
    const slug = resolveTenantSlug() ?? session?.tenantSlug
    const path = getPostLoginRedirect(location.state)
    if (!slug && isCentral) {
      setError('No se pudo determinar la empresa. Vuelve a iniciar sesión.')
      return
    }
    if (slug) {
      const stored = loadAuthSession()
      if (stored) saveAuthSession({ ...stored, tenantSlug: slug })
    }
    if (isCentral && slug) {
      window.location.replace(`${tenantAppOrigin(slug)}${path}`)
      return
    }
    navigate(path, { replace: true })
  }

  const tenantDisplayName = isCentral ? loginBranding.displayName : displayName
  const tenantLogoUrl = isCentral ? loginBranding.logoUrl : tenant?.logoUrl
  const showTenantField = isCentral && debouncedEmail.includes('@')

  if (!isReady) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isAuthenticated) {
    const path = getPostLoginRedirect(location.state)
    const slug =
      session?.tenantSlug ??
      tenant?.slug ??
      memberships.find((m) => m.tenantId === session?.tenantId)?.slug
    const hostSlug = resolveTenantSlugFromHostname(window.location.hostname)

    if (slug && (isCentralAppHost() || (hostSlug && hostSlug !== slug))) {
      window.location.replace(`${tenantAppOrigin(slug)}${path}`)
      return (
        <div className="flex min-h-svh items-center justify-center bg-background">
          <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
        </div>
      )
    }

    if (isCentralAppHost()) {
      return (
        <div className="flex min-h-svh items-center justify-center bg-background">
          <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
        </div>
      )
    }

    return <Navigate to={path} replace />
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const tenantId = isCentral ? selectedTenantId : tenant?.id
    const tenantSlug = activeMembership?.slug ?? tenant?.slug
    if (!tenantId) {
      setError('Selecciona la empresa con la que deseas ingresar.')
      return
    }
    if (isCentral && !tenantSlug) {
      setError('Espera a que cargue la lista de empresas e inténtalo de nuevo.')
      return
    }
    setLoading(true)
    try {
      const outcome = await login(
        email.trim(),
        password,
        tenantId,
        tenantSlug,
      )
      if (outcome.status === 'error') {
        setError(outcome.message)
        return
      }
      if (outcome.status === 'verify') {
        setTwoFactorStep({
          mode: 'verify',
          challengeId: outcome.challengeId,
          userEmail: outcome.userEmail,
          tenantId: outcome.tenantId,
        })
        return
      }
      if (outcome.status === 'enroll') {
        setTwoFactorStep({
          mode: 'enroll',
          enrollmentToken: outcome.enrollmentToken,
          userEmail: outcome.userEmail,
          tenantId: outcome.tenantId,
        })
        return
      }
      redirectAfterLogin()
    } finally {
      setLoading(false)
    }
  }

  function handleTwoFactorSuccess(backupCodes?: string[]) {
    if (backupCodes?.length) {
      setBackupCodesNotice(backupCodes)
      return
    }
    redirectAfterLogin()
  }

  const formProps = {
    twoFactorStep,
    backupCodesNotice,
    loading,
    error,
    email,
    password,
    setEmail,
    setPassword,
    setError,
    setTwoFactorStep,
    handleSubmit,
    handleTwoFactorSuccess,
    onContinueAfterBackup: redirectAfterLogin,
    navigate,
    locationState: location.state,
    tenantDisplayName,
    tenantLogoUrl,
    memberships: isCentral ? memberships : [],
    selectedTenantId,
    setSelectedTenantId,
    showTenantField,
  }

  return (
    <MarketingScrollContext.Provider value={scrollRef}>
      <div
        ref={scrollRef}
        className={cn(
          'marketing-scroll flex h-svh max-h-svh min-h-0 flex-col overflow-x-hidden overflow-y-auto',
          marketingTheme.pageCanvas,
        )}
      >
        <MarketingHeader />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <LoginBackground />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:flex-row">
            <section
              className={cn(
                'relative hidden flex-[1.12] flex-col justify-between overflow-hidden lg:flex',
                marketingTheme.hero,
              )}
            >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_20%_0%,rgba(147,51,234,0.28),transparent_55%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_100%,rgba(6,182,212,0.2),transparent_50%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
              backgroundSize: '56px 56px',
            }}
            aria-hidden
          />

          <div className="relative flex flex-1 flex-col px-10 py-10 xl:px-14 xl:py-12">
            <KoraLogoMark variant="hero" tone="light" size="lg" align="start" />

            <div className="flex flex-1 flex-col justify-center py-10 xl:py-14">
              <div className="max-w-lg space-y-6">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/90 backdrop-blur-sm">
                  <Sparkles aria-hidden className="size-3.5 text-cyan-300" />
                  Bienvenido de nuevo
                </p>
                <h1 className="text-[2rem] font-bold leading-[1.12] tracking-tight text-white xl:text-[2.65rem]">
                  Tu operación comercial,
                  <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-cyan-300 bg-clip-text text-transparent">
                    en un solo lugar
                  </span>
                </h1>
                <p className="max-w-md text-base leading-relaxed text-white/65">
                  Centraliza ventas, compras, inventario y equipos con una plataforma
                  diseñada para claridad, velocidad y control del negocio.
                </p>
              </div>

              <ul className="mt-10 grid max-w-xl gap-3">
                {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
                  <li
                    key={title}
                    className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md transition-colors hover:border-white/20 hover:bg-white/[0.09]"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/25 text-cyan-200 ring-1 ring-white/10">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="font-semibold text-white">{title}</p>
                      <p className="mt-1 text-sm leading-snug text-white/55">{description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-6">
              <p className="flex items-center gap-2 text-xs text-white/45">
                <Shield aria-hidden className="size-3.5 shrink-0 text-cyan-300/80" />
                Acceso seguro con permisos por perfil
              </p>
              <LoginAtriaCredit tone="light" />
            </div>
          </div>
        </section>

        <section className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-10 lg:min-h-0 lg:px-12 xl:px-16">
          <LoginFormCard {...formProps} />

          <p className="mt-7 max-w-[420px] text-center text-xs leading-relaxed text-muted-foreground">
            ¿Primera vez? Revisa el correo de bienvenida para activar tu cuenta.
          </p>

          <p className="mt-4 max-w-[420px] text-center text-xs leading-relaxed text-muted-foreground">
            <Link to={PLATFORM_PRIVACY_POLICY_PATH} className="underline-offset-2 hover:underline">
              Privacidad
            </Link>
            {' · '}
            <Link to={PLATFORM_TERMS_PATH} className="underline-offset-2 hover:underline">
              Términos
            </Link>
          </p>

          <div className="mt-8 flex w-full max-w-[420px] flex-col items-center gap-3 border-t border-border/60 pt-6 lg:hidden">
            <LoginAtriaCredit />
          </div>
        </section>
          </div>
        </div>
      </div>
    </MarketingScrollContext.Provider>
  )
}
