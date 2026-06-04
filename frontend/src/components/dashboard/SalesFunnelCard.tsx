import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { FunnelStage } from '@/types/dashboard'
import { cn } from '@/lib/utils'

type SalesFunnelCardProps = {
  stages: FunnelStage[]
  className?: string
}

export function SalesFunnelCard({ stages, className }: SalesFunnelCardProps) {
  const maxVal = Math.max(...stages.map((s) => s.value), 1)

  return (
    <Card className={cn('h-full min-w-0 overflow-hidden border-border shadow-sm', className)}>
      <CardHeader className="space-y-0.5 p-4 pb-2 sm:space-y-1 sm:p-6 sm:pb-4">
        <CardTitle className="text-sm font-semibold sm:text-base">Embudo de ventas</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Convertión por etapa</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="space-y-2.5 sm:hidden">
          {stages.map((stage) => {
            const pct = Math.round((stage.value / maxVal) * 100)
            const widthPct = Math.max(12, pct)
            return (
              <div key={`mobile-${stage.label}`} className="min-w-0 space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate font-medium text-muted-foreground">
                    {stage.label}
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-foreground">
                    {stage.value.toLocaleString('es-CO')}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-chart-1 to-chart-5"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="hidden space-y-3 sm:block">
          {stages.map((stage) => {
            const widthPct = Math.max(24, Math.round((stage.value / maxVal) * 100))
            return (
              <div key={`${stage.label}-${stage.value}`} className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs font-medium">
                  <span className="text-muted-foreground">{stage.label}</span>
                  <span className="text-foreground tabular-nums">
                    {stage.value.toLocaleString('es-CO')}
                  </span>
                </div>
                <div className="h-9 rounded-lg bg-accent/35 p-1 sm:h-11">
                  <div
                    className="relative h-full overflow-hidden rounded-md"
                    style={{ width: `${widthPct}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-chart-1 to-chart-5" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
