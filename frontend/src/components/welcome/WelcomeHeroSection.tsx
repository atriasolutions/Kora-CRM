import { ArrowUpRight, LayoutDashboard, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AppLogoImage } from '@/components/layout/AppLogoImage'
import { KoraLogoMark } from '@/components/layout/KoraLogoMark'
import { WelcomeImageSlot } from '@/components/welcome/WelcomeImageSlot'
import { WelcomeSectionLabel } from '@/components/welcome/WelcomePageBackdrop'
import { Button } from '@/components/ui/button'
import { DASHBOARD_PATH } from '@/lib/app-routes'
import { WELCOME_ASSETS } from '@/lib/welcome-assets'

type WelcomeHeroSectionProps = {
  orgName: string
  greeting: string
  firstName: string
  moduleCount: number
  showDashboard: boolean
  hasCustomLogo: boolean
  logoUrl?: string
}

export function WelcomeHeroSection({
  orgName,
  greeting,
  firstName,
  moduleCount,
  showDashboard,
  hasCustomLogo,
  logoUrl,
}: WelcomeHeroSectionProps) {
  const todayLabel = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-sm">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.05] via-transparent to-chart-5/[0.04]"
        aria-hidden
      />

      <div className="relative grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="flex flex-col justify-center gap-6 p-6 sm:p-8 lg:p-10 xl:p-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
                {hasCustomLogo ? (
                  <AppLogoImage
                    logoUrl={logoUrl}
                    alt={orgName}
                    className="max-h-9 max-w-[2.5rem] object-contain"
                  />
                ) : (
                  <KoraLogoMark size="sm" variant="framed" align="center" />
                )}
              </div>
              <div className="min-w-0">
                <WelcomeSectionLabel>{orgName}</WelcomeSectionLabel>
                <p className="truncate text-sm font-medium capitalize text-muted-foreground">
                  {todayLabel}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1 text-xs font-medium text-primary">
              <Sparkles aria-hidden className="size-3.5" />
              Espacio de trabajo
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl xl:text-[2.65rem] xl:leading-[1.12]">
              {greeting},{' '}
              <span className="welcome-name-gradient">{firstName}</span>
            </h1>
            <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-[1.05rem]">
              Tu centro de operaciones comercial. Entra a los módulos que tienes
              habilitados y mantén el ritmo con tu equipo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {showDashboard ? (
              <Button asChild size="lg" className="h-11 rounded-2xl px-6">
                <Link to={DASHBOARD_PATH}>
                  <LayoutDashboard aria-hidden className="size-4" />
                  Ver dashboard
                  <ArrowUpRight aria-hidden className="size-4 opacity-70" />
                </Link>
              </Button>
            ) : null}
            {moduleCount > 0 ? (
              <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Módulos activos
                </p>
                <p className="text-lg font-semibold tabular-nums text-foreground">
                  {moduleCount}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative min-h-[220px] border-t border-border/50 p-4 sm:p-5 lg:min-h-[280px] lg:border-t-0 lg:border-s lg:p-6">
          <WelcomeImageSlot
            asset={WELCOME_ASSETS.hero}
            className="size-full min-h-[200px] overflow-hidden rounded-[1.25rem] lg:min-h-[248px]"
            imageClassName="object-cover object-center"
          />
        </div>
      </div>
    </section>
  )
}
