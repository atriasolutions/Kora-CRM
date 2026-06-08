import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { MARKETING_TRIAL_PATH } from '@/lib/marketing-routes'
import { marketingTheme } from '@/lib/marketing-theme'
import { cn } from '@/lib/utils'

type CtaBandProps = {
  title: string
  description?: string
  primaryLabel?: string
  primaryTo?: string
  secondaryLabel?: string
  secondaryTo?: string
  className?: string
}

export function CtaBand({
  title,
  description,
  primaryLabel = 'Agendar demo gratuita',
  primaryTo = MARKETING_TRIAL_PATH,
  secondaryLabel,
  secondaryTo,
  className,
}: CtaBandProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[2rem_1.5rem_2.5rem_1.25rem] px-6 py-10 text-center sm:px-10 sm:py-12',
        marketingTheme.ctaBand,
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -start-16 top-1/2 size-56 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.35)_0%,transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -end-12 -top-8 size-44 rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.22)_0%,transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 50%)',
        }}
        aria-hidden
      />
      <div className="relative">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            {description}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className={cn(
              'min-h-11 w-full rounded-xl font-semibold text-white shadow-lg sm:w-auto',
              marketingTheme.accentGradient,
              marketingTheme.accentGradientHover,
            )}
          >
            <Link to={primaryTo}>{primaryLabel}</Link>
          </Button>
          {secondaryLabel && secondaryTo ? (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-h-11 w-full rounded-xl border-white/40 bg-transparent text-white transition-transform hover:scale-[1.02] hover:bg-white/10 sm:w-auto"
            >
              <Link to={secondaryTo}>{secondaryLabel}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
