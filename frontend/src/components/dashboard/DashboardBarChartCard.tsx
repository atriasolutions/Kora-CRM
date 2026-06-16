import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardBarDatum } from '@/types/dashboard'
import { cn } from '@/lib/utils'

const CHART_MARGIN = { top: 8, right: 8, left: 0, bottom: 0 }

type DashboardBarChartCardProps = {
  title: string
  description?: string
  items: DashboardBarDatum[]
  className?: string
}

export function DashboardBarChartCard({
  title,
  description,
  items,
  className,
}: DashboardBarChartCardProps) {
  const data = items.map((item) => ({
    label: item.label,
    value: item.value,
    color: item.color ?? 'hsl(217 91% 55%)',
  }))

  return (
    <Card className={cn('h-full min-w-0 border-border shadow-sm', className)}>
      <CardHeader className="space-y-0.5 p-4 pb-0 sm:p-6 sm:pb-2">
        <CardTitle className="truncate text-sm font-semibold sm:text-base">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="min-w-0 px-2 pb-3 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
        {data.length === 0 ? (
          <p className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 text-center text-sm text-muted-foreground sm:h-[280px]">
            Sin datos en el periodo seleccionado.
          </p>
        ) : (
        <div className="dashboard-chart h-[220px] w-full min-w-0 sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
            <BarChart data={data} margin={CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-18}
                textAnchor="end"
                height={52}
                className="text-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={32}
                tick={{ fontSize: 10 }}
                allowDecimals={false}
                className="text-muted-foreground"
              />
              <Tooltip
                formatter={(value) => (typeof value === 'number' ? value.toLocaleString('es-CL') : value)}
                contentStyle={{
                  borderRadius: 10,
                  borderColor: 'hsl(214 32% 91%)',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {data.map((entry) => (
                  <Cell key={entry.label} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        )}
      </CardContent>
    </Card>
  )
}
