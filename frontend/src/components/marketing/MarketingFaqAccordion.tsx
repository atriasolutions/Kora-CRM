import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

type FaqItem = {
  q: string
  a: string
}

type MarketingFaqAccordionProps = {
  items: readonly FaqItem[]
  className?: string
}

export function MarketingFaqAccordion({ items, className }: MarketingFaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className={cn('mx-auto max-w-2xl space-y-3', className)}>
      {items.map(({ q, a }, index) => {
        const open = openIndex === index
        return (
          <div
            key={q}
            className={cn(
              'overflow-hidden rounded-2xl border transition-all duration-300',
              open
                ? 'border-primary/30 bg-card shadow-md shadow-primary/5'
                : 'border-border/70 bg-card/80 shadow-sm hover:border-primary/20',
            )}
          >
            <button
              type="button"
              className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : index)}
            >
              <span className="font-semibold text-foreground">{q}</span>
              <ChevronDown
                aria-hidden
                className={cn(
                  'mt-0.5 size-5 shrink-0 text-primary transition-transform duration-300',
                  open && 'rotate-180',
                )}
              />
            </button>
            <div
              className={cn(
                'grid transition-all duration-300 ease-out',
                open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground sm:px-6 sm:pb-6">
                  {a}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
