import { formatBitacoraHours } from '@/lib/bitacora-form'
import { cn } from '@/lib/utils'
import type { BitacoraDashboardMonthlyQuota } from '@/types/bitacora-dashboard'

const HOURS_RING_COLOR = 'hsl(217 91% 55%)'
const MONTH_RING_COLOR = 'hsl(38 92% 50%)'
const HOURS_OVER_COLOR = 'hsl(0 72% 51%)'

function ringStroke(percent: number, radius: number): string {
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, percent))
  const filled = (clamped / 100) * circumference
  return `${filled} ${circumference}`
}

type BitacoraMonthlyQuotaRingProps = {
  quota: BitacoraDashboardMonthlyQuota
  className?: string
}

export function BitacoraMonthlyQuotaRing({
  quota,
  className,
}: BitacoraMonthlyQuotaRingProps) {
  const hoursPct = Math.min(100, Math.max(0, quota.utilizationPercent))
  const monthPct = Math.min(100, Math.max(0, quota.monthProgressPercent))
  const hoursOverQuota = quota.utilizationPercent > 100
  const hoursColor = hoursOverQuota ? HOURS_OVER_COLOR : HOURS_RING_COLOR

  return (
    <div className={cn('grid gap-4 lg:grid-cols-[minmax(0,13rem)_1fr] lg:items-center lg:gap-8', className)}>
      <div
        className="relative mx-auto size-44 shrink-0 lg:mx-0 lg:size-48"
        role="img"
        aria-label={`Cuota mensual: ${formatBitacoraHours(quota.utilizationPercent)} por ciento de horas utilizadas, ${formatBitacoraHours(quota.monthProgressPercent)} por ciento de avance del mes`}
      >
        <svg
          viewBox="0 0 100 100"
          className="size-full -rotate-90"
          aria-hidden
        >
          {/* Avance del mes — anillo interior */}
          <circle
            cx="50"
            cy="50"
            r="36"
            fill="none"
            className="stroke-muted/50"
            strokeWidth="9"
          />
          <circle
            cx="50"
            cy="50"
            r="36"
            fill="none"
            stroke={MONTH_RING_COLOR}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={ringStroke(monthPct, 36)}
          />
          {/* Horas utilizadas — anillo exterior */}
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            className="stroke-muted/50"
            strokeWidth="10"
          />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={hoursColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={ringStroke(hoursPct, 46)}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
          <span className="text-xl font-bold leading-none tracking-tight text-foreground sm:text-2xl">
            {formatBitacoraHours(quota.usedHours)} h
          </span>
          <span className="mt-1 text-[11px] font-medium text-muted-foreground">
            de {formatBitacoraHours(quota.assignedHours)} h
          </span>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5">
          <span
            className="mt-1 size-3.5 shrink-0 rounded-full ring-2 ring-background"
            style={{ backgroundColor: hoursColor }}
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Horas utilizadas
            </p>
            <p
              className={cn(
                'text-2xl font-bold tabular-nums leading-tight',
                hoursOverQuota ? 'text-destructive' : 'text-primary',
              )}
            >
              {formatBitacoraHours(quota.utilizationPercent)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Consumo respecto a la cuota mensual
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5">
          <span className="mt-1 size-3.5 shrink-0 rounded-full bg-amber-500 ring-2 ring-background" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Avance del mes
            </p>
            <p className="text-2xl font-bold tabular-nums leading-tight text-foreground">
              {formatBitacoraHours(quota.monthProgressPercent)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Tiempo transcurrido en {quota.monthLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
