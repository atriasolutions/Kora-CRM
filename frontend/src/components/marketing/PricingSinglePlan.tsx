import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'

import { MarketingReveal } from '@/components/marketing/MarketingReveal'
import { Button } from '@/components/ui/button'
import { MARKETING_SINGLE_PLAN } from '@/lib/marketing-content'
import { MARKETING_TRIAL_PATH } from '@/lib/marketing-routes'
import { marketingTheme } from '@/lib/marketing-theme'
import { cn } from '@/lib/utils'

export function PricingSinglePlan() {
  const plan = MARKETING_SINGLE_PLAN

  return (
    <MarketingReveal>
      <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-2xl shadow-primary/10">
        <div className="bg-gradient-to-br from-primary/15 via-background to-chart-5/15 px-6 py-8 sm:px-10 sm:py-10">
          <div className="text-center">
            <p className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              Plan único
            </p>
            <h3 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {plan.name}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.tagline}</p>
          </div>

          <div className="mt-8 text-center">
            <p className="text-5xl font-bold tracking-tight text-foreground">{plan.priceLabel}</p>
            <p className="mt-2 text-sm text-muted-foreground">{plan.priceHint}</p>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {plan.includedHighlights.map((item) => (
              <li
                key={item}
                className={cn(
                  'flex items-start gap-3 rounded-xl border border-border/50 bg-card/80 px-3 py-2.5 text-sm',
                  'transition-colors hover:border-primary/20 hover:bg-primary/[0.03]',
                )}
              >
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                  <Check aria-hidden className="size-3" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <Button
            asChild
            size="lg"
            className={cn(
              'mt-8 min-h-12 w-full rounded-xl text-base font-semibold text-white shadow-lg',
              marketingTheme.accentGradient,
            )}
          >
            <Link to={MARKETING_TRIAL_PATH}>Solicitar propuesta</Link>
          </Button>
        </div>
      </div>
    </MarketingReveal>
  )
}
