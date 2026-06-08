import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type StatItem = {
  icon: LucideIcon
  value: string
  label: string
}

type MarketingStatsStripProps = {
  items: readonly StatItem[]
  dark?: boolean
  className?: string
}

export function MarketingStatsStrip({ items, dark = false, className }: MarketingStatsStripProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:grid-cols-4',
        dark
          ? 'border-white/10 bg-white/5'
          : 'border-border/70 bg-border/40 shadow-sm',
        className,
      )}
    >
      {items.map(({ icon: Icon, value, label }) => (
        <div
          key={label}
          className={cn(
            'flex flex-col items-center gap-2 px-4 py-5 text-center sm:py-6',
            dark ? 'bg-slate-950/40' : 'bg-card',
          )}
        >
          <Icon
            aria-hidden
            className={cn('size-5', dark ? 'text-chart-5' : 'text-primary')}
          />
          <p
            className={cn(
              'text-xl font-semibold tracking-tight sm:text-2xl',
              dark ? 'text-white' : 'text-foreground',
            )}
          >
            {value}
          </p>
          <p
            className={cn(
              'text-xs leading-snug sm:text-sm',
              dark ? 'text-white/60' : 'text-muted-foreground',
            )}
          >
            {label}
          </p>
        </div>
      ))}
    </div>
  )
}
