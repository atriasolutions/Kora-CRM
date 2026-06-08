import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'

import { MarketingAmbientMotion } from '@/components/marketing/MarketingAmbientMotion'
import { MarketingBrandBackdrop } from '@/components/marketing/MarketingBrandBackdrop'
import { MarketingHeroScreenshot } from '@/components/marketing/MarketingHeroScreenshot'
import { MarketingStatsStrip } from '@/components/marketing/MarketingStatsStrip'
import { Button } from '@/components/ui/button'
import { APP_HOME_PATH } from '@/lib/app-routes'
import { getLoginPath } from '@/lib/auth-routes'
import { MARKETING_ASSETS } from '@/lib/marketing-assets'
import { MARKETING_HERO_BADGE, MARKETING_HERO_STATS } from '@/lib/marketing-content'
import { marketingTheme } from '@/lib/marketing-theme'
import {
  MARKETING_FEATURES_PATH,
  MARKETING_TRIAL_PATH,
} from '@/lib/marketing-routes'
import { cn } from '@/lib/utils'

type MarketingHeroProps = {
  title: string
  subtitle: string
  badge?: string
  showAuthCta?: boolean
  compact?: boolean
  showStats?: boolean
}

export function MarketingHero({
  title,
  subtitle,
  badge = MARKETING_HERO_BADGE,
  showAuthCta = false,
  compact = false,
  showStats = false,
}: MarketingHeroProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden text-white',
        marketingTheme.hero,
        compact ? 'py-14 sm:py-16' : 'pb-16 pt-8 sm:pb-20 sm:pt-10 lg:pb-24 lg:pt-12',
      )}
    >
      <MarketingBrandBackdrop variant="hero" />
      <MarketingAmbientMotion />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-10 xl:gap-14">
          <div className="marketing-fade-in max-w-xl">
            <p
              className={cn(
                'mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]',
                marketingTheme.badge,
              )}
            >
              <Sparkles aria-hidden className={cn('size-3.5', marketingTheme.sparkle)} />
              {badge}
            </p>
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]">
              <span className="marketing-heading-gradient">{title}</span>
            </h1>
            <p className="mt-5 text-pretty text-base leading-relaxed text-white/65 sm:text-lg">
              {subtitle}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                asChild
                size="lg"
                className={cn(
                  'min-h-12 w-full rounded-2xl px-6 text-base font-semibold text-white shadow-md shadow-violet-900/30 sm:w-auto',
                  marketingTheme.accentGradient,
                  marketingTheme.accentGradientHover,
                )}
              >
                <Link to={MARKETING_TRIAL_PATH}>
                  Agendar demo gratuita
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-h-12 w-full rounded-2xl border-white/20 bg-white/10 text-base text-white hover:bg-white/14 sm:w-auto"
              >
                <Link to={MARKETING_FEATURES_PATH}>Ver cómo funciona</Link>
              </Button>
              {showAuthCta ? (
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="min-h-12 w-full rounded-2xl text-white/90 hover:bg-white/10 sm:w-auto"
                >
                  <Link to={APP_HOME_PATH}>Ir al CRM</Link>
                </Button>
              ) : (
                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="min-h-12 w-full rounded-2xl text-white/75 hover:bg-white/10 sm:w-auto"
                >
                  <Link to={getLoginPath()}>Iniciar sesión</Link>
                </Button>
              )}
            </div>
          </div>

          <div className="marketing-fade-in marketing-fade-in-delay relative w-full lg:justify-self-end">
            <MarketingHeroScreenshot asset={MARKETING_ASSETS.hero} className="lg:ms-auto" />
          </div>
        </div>

        {showStats ? (
          <div className="marketing-fade-in marketing-fade-in-delay mt-12 sm:mt-14">
            <MarketingStatsStrip items={MARKETING_HERO_STATS} dark />
          </div>
        ) : null}
      </div>
    </section>
  )
}
