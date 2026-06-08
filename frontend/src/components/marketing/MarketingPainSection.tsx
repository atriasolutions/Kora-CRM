import type { LucideIcon } from 'lucide-react'

import { MarketingReveal } from '@/components/marketing/MarketingReveal'
import {
  MarketingSection,
  MarketingSectionHeader,
} from '@/components/marketing/MarketingSection'
import { cn } from '@/lib/utils'

export type MarketingPainPoint = {
  icon: LucideIcon
  title: string
  description: string
}

type MarketingPainSectionProps = {
  eyebrow?: string
  title: string
  description?: string
  items: readonly MarketingPainPoint[]
  className?: string
}

/** Problemas del público objetivo — ancla emocional antes de la propuesta de valor. */
export function MarketingPainSection({
  eyebrow = 'El problema',
  title,
  description,
  items,
  className,
}: MarketingPainSectionProps) {
  return (
    <MarketingSection className={cn('py-12 sm:py-14', className)}>
      <MarketingSectionHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item, index) => {
          const Icon = item.icon
          return (
            <MarketingReveal key={item.title} delay={index * 70}>
              <article className="h-full rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
                <span className="grid size-11 place-items-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/15">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </article>
            </MarketingReveal>
          )
        })}
      </div>
    </MarketingSection>
  )
}
