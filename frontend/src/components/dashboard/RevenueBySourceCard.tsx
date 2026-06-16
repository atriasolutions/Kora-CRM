import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { RevenueSourceDatum } from '@/types/dashboard'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { cn } from '@/lib/utils'

function totalSources(items: RevenueSourceDatum[]) {
  return items.reduce((acc, slice) => acc + slice.value, 0)
}

const currencyFmt = Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

type RevenueBySourceCardProps = {
  slices: RevenueSourceDatum[]
  className?: string
}

export function RevenueBySourceCard({ slices, className }: RevenueBySourceCardProps) {
  const total = totalSources(slices)

  return (
    <Card className={cn('h-full min-w-0 border-border shadow-sm', className)}>
      <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-4">
        <CardTitle className="text-sm font-semibold sm:text-base">Ingresos por fuente</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Facturas pagadas en el periodo, por origen de la oportunidad
        </CardDescription>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4 px-4 pb-4 sm:gap-6 sm:px-6 sm:pb-6 md:grid-cols-[minmax(0,240px),minmax(0,1fr)] lg:grid-cols-[240px,minmax(0,1fr)]">
        <div className="dashboard-chart relative mx-auto h-[180px] w-full min-w-0 sm:h-[200px] md:mx-0 md:h-[220px] lg:h-[244px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
            <PieChart>
              <Tooltip
                formatter={(value) => `$${currencyFmt.format(Number(value ?? 0))}`}
                contentStyle={{ borderRadius: 10, borderColor: 'hsl(214 32% 91%)', fontSize: 12 }}
              />
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="88%"
                paddingAngle={2}
              >
                {slices.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} stroke="transparent" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
              Total
            </p>
            <p className="text-base font-bold text-foreground sm:text-xl">
              ${currencyFmt.format(total)}
            </p>
          </div>
        </div>

        <ul className="grid min-w-0 grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-2.5 md:block md:space-y-4">
          {slices.map((slice) => (
            <li
              key={slice.name}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 text-sm sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0"
            >
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full sm:size-3 sm:rounded-[3px]"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate text-xs font-medium text-foreground sm:text-sm">
                  {slice.name}
                </span>
              </div>
              <div className="shrink-0 text-end tabular-nums">
                <p className="text-xs font-bold text-foreground sm:text-sm">
                  {slice.pct}%
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
