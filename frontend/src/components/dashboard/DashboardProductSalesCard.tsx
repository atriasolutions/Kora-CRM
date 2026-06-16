import { TrendingDown, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardProductSalesSection } from '@/types/dashboard'
import { cn } from '@/lib/utils'

type DashboardProductSalesCardProps = {
  section: DashboardProductSalesSection
  variant: 'top' | 'bottom'
  className?: string
}

function formatQuantity(qty: number): string {
  const n = Math.round(qty * 1000) / 1000
  return Number.isInteger(n)
    ? n.toLocaleString('es-CL')
    : n.toLocaleString('es-CL', { maximumFractionDigits: 2 })
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function DashboardProductSalesCard({
  section,
  variant,
  className,
}: DashboardProductSalesCardProps) {
  const Icon = variant === 'top' ? TrendingUp : TrendingDown
  const accent =
    variant === 'top'
      ? 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-card'
      : 'border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-card'

  return (
    <Card className={cn('h-full min-w-0 border shadow-sm', accent, className)}>
      <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold sm:text-base">
          <Icon
            aria-hidden
            className={cn(
              'size-4 shrink-0',
              variant === 'top' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
            )}
          />
          {section.title}
        </CardTitle>
        {section.description ? (
          <CardDescription className="text-xs sm:text-sm">{section.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        {section.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
            Sin ventas registradas en el periodo seleccionado.
          </p>
        ) : (
          <ol className="space-y-2">
            {section.items.map((item, index) => {
              const href = UUID_RE.test(item.id) ? `/productos/${item.id}` : undefined
              const row = (
                <>
                  <span
                    className={cn(
                      'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                      variant === 'top'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{item.name}</p>
                    {item.sku ? (
                      <p className="truncate text-xs text-muted-foreground">{item.sku}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                    {formatQuantity(item.quantity)} u.
                  </span>
                </>
              )

              return (
                <li key={`${item.id}-${index}`}>
                  {href ? (
                    <Link
                      to={href}
                      className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 transition hover:bg-muted/40"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
                      {row}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
