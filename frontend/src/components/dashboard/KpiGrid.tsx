import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Target,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import type { KpiAccent, KpiDatum } from '@/types/dashboard'
import { cn } from '@/lib/utils'

function formatChangeLabel(pct: number) {
  if (pct > 0) return `+${pct}%`
  if (pct < 0) return `−${Math.abs(pct)}%`
  return `${pct}%`
}

const accentStyles: Record<
  KpiAccent,
  { card: string; icon: string; Icon: typeof Target }
> = {
  blue: {
    card: 'border-primary/15 bg-gradient-to-br from-primary/12 via-card to-card',
    icon: 'bg-primary/15 text-primary',
    Icon: Target,
  },
  emerald: {
    card: 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/12 via-card to-card',
    icon: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    Icon: DollarSign,
  },
  violet: {
    card: 'border-violet-500/20 bg-gradient-to-br from-violet-500/12 via-card to-card',
    icon: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    Icon: Users,
  },
  amber: {
    card: 'border-amber-500/20 bg-gradient-to-br from-amber-500/12 via-card to-card',
    icon: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    Icon: Zap,
  },
  rose: {
    card: 'border-rose-500/20 bg-gradient-to-br from-rose-500/12 via-card to-card',
    icon: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    Icon: Wallet,
  },
}

export function KpiGrid({ items }: { items: KpiDatum[] }) {
  return (
    <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-5">
      {items.map((kpi) => {
        const improving = kpi.changePercent >= 0
        const { card, icon, Icon } = accentStyles[kpi.accent]

        return (
          <Card
            key={kpi.id}
            className={cn(
              'min-w-0 overflow-hidden border shadow-sm max-sm:rounded-2xl max-sm:shadow-md',
              card,
            )}
          >
            <CardContent className="min-w-0 space-y-2 p-3 sm:space-y-3 sm:p-5">
              <div className="flex items-center justify-between gap-1.5">
                <span
                  className={cn(
                    'inline-flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-9',
                    icon,
                  )}
                >
                  <Icon aria-hidden className="size-4 sm:size-[18px]" />
                </span>
                <span
                  className={cn(
                    'inline-flex max-w-[52%] shrink-0 items-center gap-0.5 truncate rounded-full px-1.5 py-0.5 text-[10px] font-bold sm:max-w-none sm:gap-1 sm:px-2 sm:text-xs',
                    improving
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
                  )}
                >
                  {improving ? (
                    <ArrowUpRight className="size-3 shrink-0 sm:size-3.5" aria-hidden />
                  ) : (
                    <ArrowDownRight className="size-3 shrink-0 sm:size-3.5" aria-hidden />
                  )}
                  {formatChangeLabel(kpi.changePercent)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium leading-tight text-muted-foreground sm:text-sm">
                  {kpi.title}
                </p>
                <p className="mt-0.5 truncate text-base font-bold tracking-tight text-foreground sm:mt-1 sm:text-2xl">
                  {kpi.value}
                </p>
              </div>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {kpi.subtitle}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
