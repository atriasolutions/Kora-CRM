import { Check, X } from 'lucide-react'

import { MarketingReveal } from '@/components/marketing/MarketingReveal'
import {
  MarketingSection,
  MarketingSectionHeader,
} from '@/components/marketing/MarketingSection'
import { MARKETING_COMPARE, MARKETING_COMPARE_SECTION } from '@/lib/marketing-content'

export function MarketingCompareSection() {
  const heading = MARKETING_COMPARE_SECTION

  return (
    <MarketingSection tone="muted">
      <MarketingSectionHeader
        eyebrow={heading.eyebrow}
        title={heading.title}
        description={heading.description}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <MarketingReveal>
          <div className="h-full rounded-2xl border border-destructive/20 bg-destructive/[0.03] p-6 sm:p-8">
            <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <X aria-hidden className="size-4" />
              Sin un sistema integrado
            </p>
            <ul className="mt-5 space-y-3">
              {MARKETING_COMPARE.without.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground"
                >
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-destructive/60" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </MarketingReveal>
        <MarketingReveal delay={120}>
          <div className="relative h-full overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/8 via-card to-chart-5/8 p-6 shadow-lg shadow-primary/5 sm:p-8">
            <div
              className="pointer-events-none absolute -end-10 -top-10 size-40 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.12)_0%,transparent_70%)]"
              aria-hidden
            />
            <p className="relative flex items-center gap-2 text-sm font-semibold text-primary">
              <Check aria-hidden className="size-4" />
              Con Kora CRM
            </p>
            <ul className="relative mt-5 space-y-3">
              {MARKETING_COMPARE.with.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm leading-relaxed text-foreground"
                >
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <Check aria-hidden className="size-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </MarketingReveal>
      </div>
    </MarketingSection>
  )
}
