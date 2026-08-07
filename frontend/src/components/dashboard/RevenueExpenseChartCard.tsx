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
import type { RevenueExpensePoint } from '@/types/dashboard'
import { cn } from '@/lib/utils'

const CHART_MARGIN = { top: 8, right: 8, left: 4, bottom: 0 }

type RevenueExpenseChartCardProps = {
  series: RevenueExpensePoint[]
  description?: string
  className?: string
}

export function RevenueExpenseChartCard({
  series,
  description = 'Comparación del periodo',
  className,
}: RevenueExpenseChartCardProps) {
  return (
    <Card className={cn('h-full min-w-0 border-border shadow-sm', className)}>
      <CardHeader className="space-y-0.5 p-4 pb-0 sm:p-6 sm:pb-2">
        <CardTitle className="truncate text-sm font-semibold sm:text-base">
          Ingresos vs. gastos
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 px-2 pb-3 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
        <div className="dashboard-chart dashboard-chart--line h-[200px] w-full min-w-0 sm:h-[280px] lg:h-[300px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
            <LineChart data={series} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
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
                  typeof v === 'number' ? formatCompactChartMoney(v) : String(v)
                }
              />
              <Tooltip
                formatter={(value) =>
                  typeof value === 'number' ? formatChartMoneyTooltip(value) : value
                }
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
              <Line
                type="monotone"
                dataKey="ingresos"
                name="Ingresos"
                stroke="hsl(217 91% 55%)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="gastos"
                name="Gastos"
                stroke="hsl(142 76% 45%)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 flex flex-wrap justify-center gap-3 text-[10px] text-muted-foreground sm:hidden">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[hsl(217_91%_55%)]" aria-hidden />
            Ingresos
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[hsl(142_76%_45%)]" aria-hidden />
            Gastos
          </span>
        </p>
      </CardContent>
    </Card>
  )
}
