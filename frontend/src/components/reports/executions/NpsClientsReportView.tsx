import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TrendingUp } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { NpsReportResult } from '@/data/nps-report.mock'
import { npsScoreClass, npsScoreLabel } from '@/lib/report-execution'
import { cn } from '@/lib/utils'

const DISTRIBUTION_COLORS = [
  'hsl(142 76% 45%)',
  'hsl(215 16% 47%)',
  'hsl(0 72% 51%)',
]

type NpsClientsReportViewProps = {
  result: NpsReportResult
}

export function NpsClientsReportView({ result }: NpsClientsReportViewProps) {
  const distribution = [
    { name: 'Promotores', value: result.promotersPct },
    { name: 'Pasivos', value: result.passivesPct },
    { name: 'Detractores', value: result.detractorsPct },
  ]

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Generado el {result.generatedAt} · {result.totalResponses} respuestas
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">NPS global</p>
            <p className={cn('mt-1 text-3xl font-bold tabular-nums', npsScoreClass(result.overallNps))}>
              {result.overallNps}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{npsScoreLabel(result.overallNps)}</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">vs. trimestre anterior</p>
            <p className="mt-1 flex items-center gap-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              <TrendingUp aria-hidden className="size-5" />+{result.vsPreviousQuarter}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">puntos NPS</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Promotores (9-10)</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {result.promotersPct}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Detractores (0-6)</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-destructive">
              {result.detractorsPct}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">NPS por segmento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="dashboard-chart h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={result.bySegment} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="segment" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'nps') return [`${value}`, 'NPS']
                      return [value, name]
                    }}
                  />
                  <Bar dataKey="nps" name="NPS" radius={[4, 4, 0, 0]} fill="hsl(217 91% 55%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Evolución trimestral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="dashboard-chart h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={result.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[30, 70]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => [`${v}`, 'NPS']} />
                  <Line
                    type="monotone"
                    dataKey="nps"
                    stroke="hsl(217 91% 55%)"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Distribución de respuestas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="dashboard-chart mx-auto h-[160px] max-w-md">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={distribution} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Bar dataKey="value" radius={4}>
                  {distribution.map((_, i) => (
                    <Cell key={distribution[i]!.name} fill={DISTRIBUTION_COLORS[i]!} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Comentarios recientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.verbatims.map((v) => (
            <blockquote
              key={v.id}
              className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm"
            >
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{v.company}</span>
                <Badge variant={v.score >= 9 ? 'customer' : v.score >= 7 ? 'secondary' : 'destructive'}>
                  {v.score}/10
                </Badge>
              </div>
              <p className="text-muted-foreground">{v.comment}</p>
            </blockquote>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
