import type { LucideIcon } from 'lucide-react'
import { Quote } from 'lucide-react'

import { MarketingReveal } from '@/components/marketing/MarketingReveal'
import { cn } from '@/lib/utils'

type Testimonial = {
  quote: string
  name: string
  role: string
  company: string
}

type MarketingTestimonialsProps = {
  items: readonly Testimonial[]
  className?: string
}

export function MarketingTestimonials({ items, className }: MarketingTestimonialsProps) {
  return (
    <div className={cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {items.map((item, index) => (
        <MarketingReveal key={item.name} delay={index * 80}>
          <figure
            className={cn(
              'group relative flex h-full flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-sm',
              'transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5',
            )}
          >
            <Quote
              aria-hidden
              className="size-8 text-primary/20 transition-colors group-hover:text-primary/35"
            />
            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
              “{item.quote}”
            </blockquote>
            <figcaption className="mt-5 border-t border-border/60 pt-4">
              <p className="font-semibold text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.role} · {item.company}
              </p>
            </figcaption>
          </figure>
        </MarketingReveal>
      ))}
    </div>
  )
}

type UseCase = {
  icon: LucideIcon
  title: string
  subtitle: string
  pain: string
  solution: string
  outcomes: readonly string[]
}

type MarketingUseCasesProps = {
  items: readonly UseCase[]
}

export function MarketingUseCases({ items }: MarketingUseCasesProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {items.map((item, index) => {
        const Icon = item.icon
        return (
          <MarketingReveal key={item.title} delay={index * 100}>
            <article className="group flex h-full flex-col rounded-2xl border border-border/70 bg-gradient-to-b from-card to-muted/20 p-6 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md">
              <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-transform duration-300 group-hover:scale-105">
                <Icon aria-hidden className="size-5" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-primary">
                {item.subtitle}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.pain}</p>
              <p className="mt-3 text-sm leading-relaxed text-foreground">{item.solution}</p>
              <ul className="mt-4 space-y-2 border-t border-border/60 pt-4">
                {item.outcomes.map((outcome) => (
                  <li
                    key={outcome}
                    className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-chart-5" />
                    {outcome}
                  </li>
                ))}
              </ul>
            </article>
          </MarketingReveal>
        )
      })}
    </div>
  )
}
