import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { RecentOpportunity } from '@/types/dashboard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function statusVariant(status: string): 'proposal' | 'negotiation' | 'qualified' {
  if (status === 'Propuesta') return 'proposal'
  if (status === 'Negociación') return 'negotiation'
  return 'qualified'
}

type RecentOpportunitiesCardProps = {
  items: RecentOpportunity[]
  className?: string
}

export function RecentOpportunitiesCard({
  items,
  className,
}: RecentOpportunitiesCardProps) {
  return (
    <Card className={cn('h-full min-w-0 overflow-hidden border-border shadow-sm', className)}>
      <CardHeader className="gap-0.5 p-4 pb-2 sm:gap-1 sm:p-6 sm:pb-4">
        <CardTitle className="text-sm font-semibold sm:text-base">
          Oportunidades recientes
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm md:hidden">
          Últimas oportunidades del pipeline
        </CardDescription>
        <CardDescription className="hidden text-xs sm:text-sm md:block">
          Vista detallada por filas
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 px-0 pb-3 sm:pb-3">
        {/* Móvil / tablet: lista vertical sin scroll horizontal */}
        <ul className="divide-y divide-border md:hidden">
          {items.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 items-start justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.company}</p>
                <Badge className="mt-1.5" variant={statusVariant(row.status)}>
                  {row.status}
                </Badge>
              </div>
              <p className="shrink-0 text-sm font-bold tabular-nums text-primary">
                {row.amountLabel}
              </p>
            </li>
          ))}
        </ul>

        <div className="hidden min-w-0 md:block">
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] gap-x-3 border-b border-border px-6 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Oportunidad</span>
            <span>Cliente</span>
            <span className="text-center">Etapa</span>
            <span className="text-end">Monto</span>
          </div>
          <div className="divide-y divide-border px-2">
            {items.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] items-center gap-x-3 px-4 py-3"
              >
                <span className="truncate text-sm font-semibold text-foreground">
                  {row.name}
                </span>
                <span className="truncate text-sm text-muted-foreground">{row.company}</span>
                <span>
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                </span>
                <span className="text-end text-sm font-semibold tabular-nums text-foreground">
                  {row.amountLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
