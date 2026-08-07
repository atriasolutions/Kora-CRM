import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  formatChartMoneyTooltip,
  formatCompactChartMoney,
} from '@/lib/dashboard-money-format'
import type { DashboardTimeSeriesLine, DashboardTimeSeriesPoint } from '@/types/dashboard'
import { cn } from '@/lib/utils'

const CHART_MARGIN = { top: 8, right: 8, left: 4, bottom: 0 }

type DashboardTimeSeriesChartCardProps = {
  title: string
  description?: string
  series: DashboardTimeSeriesPoint[]
  lines: DashboardTimeSeriesLine[]
  valueFormatter?: (value: number) => string
  className?: string
}

export function DashboardTimeSeriesChartCard({
  title,
  description,
  series,
  lines,
  valueFormatter,
  className,
}: DashboardTimeSeriesChartCardProps) {
  const currencyLike = lines.some((line) =>
    ['ingresos', 'gastos', 'compras'].includes(line.key),
  )

  const formatValue =
    valueFormatter ??
    ((value: number) => {
      if (currencyLike) return formatCompactChartMoney(value)
      if (Math.abs(value) >= 1000) return formatCompactChartMoney(value)
      return value.toLocaleString('es-CL')
    })

  return (
    <Card className={cn('h-full min-w-0 border-border shadow-sm', className)}>
      <CardHeader className="space-y-0.5 p-4 pb-0 sm:p-6 sm:pb-2">
        <CardTitle className="truncate text-sm font-semibold sm:text-base">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="min-w-0 px-2 pb-3 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
        <div className="dashboard-chart dashboard-chart--line h-[200px] w-full min-w-0 sm:h-[280px] lg:h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
            <LineChart data={series} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                className="text-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tickMargin={6}
                tick={{ fill: 'hsl(215 16% 47%)', fontSize: 10 }}
                tickFormatter={(v) =>
                  typeof v === 'number' ? formatValue(v) : String(v)
                }
              />
              <Tooltip
                formatter={(value) => {
                  if (typeof value !== 'number') return value
                  return currencyLike
                    ? formatChartMoneyTooltip(value)
                    : `${formatValue(value)} h`
                }}
                contentStyle={{
                  borderRadius: 10,
                  borderColor: 'hsl(214 32% 91%)',
                  fontSize: 12,
                }}
              />
              <Legend
                verticalAlign="top"
                height={28}
                wrapperStyle={{ fontSize: 11, paddingBottom: 4 }}
                iconSize={8}
              />
              {lines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.label}
                  stroke={line.color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
