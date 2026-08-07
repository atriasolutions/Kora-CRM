import {
  BarChart3,
  Building2,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Loader2,
  Settings2,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BitacoraMonthlyQuotaSection } from '@/components/bitacora/BitacoraMonthlyQuotaSection'
import { formatBitacoraHours } from '@/lib/bitacora-form'
import { cn } from '@/lib/utils'
import type { BitacoraDashboardStats } from '@/types/bitacora-dashboard'
import {
  BITACORA_BILLABLE_CHART_COLOR,
  BITACORA_NON_BILLABLE_CHART_COLOR,
} from '@/types/bitacora-dashboard'

const CHART_MARGIN = { top: 8, right: 8, left: 0, bottom: 0 }

type BitacoraDashboardViewProps = {
  stats: BitacoraDashboardStats | null
  loading: boolean
  fromApi: boolean
  canConfigureMonthlyQuota?: boolean
  onConfigureMonthlyQuota?: () => void
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string
  value: string
  subtitle: string
  icon: typeof Clock3
  accent: 'blue' | 'emerald' | 'amber' | 'violet'
}) {
  const accents = {
    blue: 'border-primary/20 bg-gradient-to-br from-primary/12 via-card to-card text-primary',
    emerald:
      'border-emerald-500/20 bg-gradient-to-br from-emerald-500/12 via-card to-card text-emerald-600 dark:text-emerald-400',
    amber:
      'border-amber-500/20 bg-gradient-to-br from-amber-500/12 via-card to-card text-amber-600 dark:text-amber-400',
    violet:
      'border-violet-500/20 bg-gradient-to-br from-violet-500/12 via-card to-card text-violet-600 dark:text-violet-400',
  }

  return (
    <Card className={cn('min-w-0 overflow-hidden border shadow-sm', accents[accent])}>
      <CardContent className="space-y-2 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </span>
          <span
            className={cn(
              'inline-flex size-9 items-center justify-center rounded-xl bg-background/70',
              accent === 'blue' && 'text-primary',
              accent === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
              accent === 'amber' && 'text-amber-600 dark:text-amber-400',
              accent === 'violet' && 'text-violet-600 dark:text-violet-400',
            )}
          >
            <Icon aria-hidden className="size-4" />
          </span>
        </div>
        <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{value}</p>
        <p className="text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

function hoursTooltipFormatter(value: unknown) {
  if (typeof value !== 'number') return value
  return `${formatBitacoraHours(value)} h`
}

/** Ancho del eje Y en barras horizontales según la etiqueta más larga. */
function verticalBarYAxisWidth(labels: string[], min = 88, max = 140): number {
  const longest = labels.reduce((acc, label) => Math.max(acc, label.length), 0)
  return Math.min(max, Math.max(min, Math.ceil(longest * 7.2 + 10)))
}

const VERTICAL_BAR_CHART_MARGIN = { left: 8, right: 16, top: 8, bottom: 0 }

export function BitacoraDashboardView({
  stats,
  loading,
  fromApi,
  canConfigureMonthlyQuota = false,
  onConfigureMonthlyQuota,
}: BitacoraDashboardViewProps) {
  if (loading || !stats) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
        <span className="sr-only">Cargando dashboard de bitácora…</span>
      </div>
    )
  }

  const splitSlices = [
    {
      name: 'Facturables',
      value: stats.billableHours,
      color: BITACORA_BILLABLE_CHART_COLOR,
      pct:
        stats.totalHours > 0
          ? Math.round((stats.billableHours / stats.totalHours) * 100)
          : 0,
    },
    {
      name: 'No facturables',
      value: stats.nonBillableHours,
      color: BITACORA_NON_BILLABLE_CHART_COLOR,
      pct:
        stats.totalHours > 0
          ? Math.round((stats.nonBillableHours / stats.totalHours) * 100)
          : 0,
    },
  ]

  const trendData = stats.byMonth.map((point) => ({
    label: point.label,
    facturables: point.billableHours,
    noFacturables: point.nonBillableHours,
    total: point.totalHours,
  }))

  const solicitudData = stats.bySolicitud.map((point) => ({
    name: point.code,
    title: point.title,
    facturables: point.billableHours,
    noFacturables: point.nonBillableHours,
    total: point.totalHours,
  }))

  const companyData = stats.byCompany.map((point) => ({
    name: point.companyName,
    facturables: point.billableHours,
    noFacturables: point.nonBillableHours,
    total: point.totalHours,
  }))

  const userData = (stats.byUser ?? []).map((point) => ({
    name: point.assignedUserName,
    userId: point.assignedUserId,
    facturables: point.billableHours,
    noFacturables: point.nonBillableHours,
    total: point.totalHours,
    entries: point.entryCount,
  }))

  const solicitudYAxisWidth = verticalBarYAxisWidth(solicitudData.map((d) => d.name))
  const userYAxisWidth = verticalBarYAxisWidth(userData.map((d) => d.name), 96, 160)
  const companyYAxisWidth = verticalBarYAxisWidth(companyData.map((d) => d.name), 96, 160)

  const hasData = stats.entryCount > 0
  const monthlyQuota = stats.monthlyQuota ?? null

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 pb-8 sm:space-y-6 sm:p-6">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-amber-500/10 p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -end-8 -top-8 size-36 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-6 start-10 size-24 rounded-full bg-amber-500/20 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles aria-hidden className="size-3.5" />
              Resumen para cliente
            </p>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Horas registradas en bitácora
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {stats.companyName
                ? `Datos limitados a la empresa ${stats.companyName}.`
                : fromApi
                  ? 'Totales agregados desde la base de datos según los filtros aplicados.'
                  : 'Totales calculados desde los registros visibles en pantalla.'}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
                <CalendarRange aria-hidden className="size-3.5 text-primary" />
                {stats.periodLabel}
              </span>
              {stats.companyName ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
                  <Building2 aria-hidden className="size-3.5 text-primary" />
                  {stats.companyName}
                </span>
              ) : null}
            </div>
            {canConfigureMonthlyQuota &&
            stats.companyId &&
            onConfigureMonthlyQuota &&
            !monthlyQuota ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 h-8 gap-1.5 bg-background/80"
                onClick={onConfigureMonthlyQuota}
              >
                <Settings2 aria-hidden className="size-3.5" />
                Configurar cuota mensual
              </Button>
            ) : null}
          </div>
          <div className="shrink-0 rounded-xl border border-border/70 bg-background/85 px-5 py-3 text-center shadow-sm backdrop-blur-sm sm:min-w-[9rem]">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Participación facturable
            </p>
            <p className="mt-1 text-3xl font-bold text-primary">
              {formatBitacoraHours(stats.billableSharePercent)}%
            </p>
          </div>
        </div>
      </section>

      {monthlyQuota ? (
        <BitacoraMonthlyQuotaSection
          quota={monthlyQuota}
          companyName={stats.companyName}
          canConfigure={canConfigureMonthlyQuota && Boolean(stats.companyId)}
          onConfigure={onConfigureMonthlyQuota}
        />
      ) : null}

      <section className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Total horas"
          value={`${formatBitacoraHours(stats.totalHours)} h`}
          subtitle={`${stats.entryCount} registro${stats.entryCount === 1 ? '' : 's'} en el período`}
          icon={Clock3}
          accent="blue"
        />
        <KpiCard
          title="Horas facturables"
          value={`${formatBitacoraHours(stats.billableHours)} h`}
          subtitle="Trabajo incluido en facturación"
          icon={CheckCircle2}
          accent="emerald"
        />
        <KpiCard
          title="Horas no facturables"
          value={`${formatBitacoraHours(stats.nonBillableHours)} h`}
          subtitle="Soporte, garantía u otros motivos"
          icon={BarChart3}
          accent="amber"
        />
        <KpiCard
          title="Usuarios"
          value={String(userData.length)}
          subtitle="Con horas imputadas en el período"
          icon={UsersRound}
          accent="violet"
        />
      </section>

      {!hasData ? (
        <Card className="border-dashed border-border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <Clock3 aria-hidden className="size-10 text-muted-foreground/50" />
            <p className="text-base font-medium text-foreground">Sin registros en este período</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Ajusta el rango de fechas o la empresa en los filtros para ver el resumen de horas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid min-w-0 gap-4 xl:grid-cols-5">
            <Card className="min-w-0 border-border shadow-sm xl:col-span-2">
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="text-sm font-semibold sm:text-base">
                  Distribución de horas
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Proporción entre horas facturables y no facturables
                </CardDescription>
              </CardHeader>
              <CardContent className="grid min-w-0 gap-4 px-4 pb-4 sm:px-6 sm:pb-6 md:grid-cols-[minmax(0,220px),1fr]">
                <div className="dashboard-chart relative mx-auto h-[200px] w-full min-w-0 sm:h-[220px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                    <PieChart>
                      <Tooltip
                        formatter={hoursTooltipFormatter}
                        contentStyle={{
                          borderRadius: 10,
                          borderColor: 'hsl(214 32% 91%)',
                          fontSize: 12,
                        }}
                      />
                      <Pie
                        data={splitSlices}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="58%"
                        outerRadius="88%"
                        paddingAngle={2}
                      >
                        {splitSlices.map((slice) => (
                          <Cell key={slice.name} fill={slice.color} stroke="transparent" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Total
                    </p>
                    <p className="text-lg font-bold text-foreground sm:text-xl">
                      {formatBitacoraHours(stats.totalHours)} h
                    </p>
                  </div>
                </div>
                <ul className="space-y-3">
                  {splitSlices.map((slice) => (
                    <li
                      key={slice.name}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="truncate text-sm font-medium">{slice.name}</span>
                      </div>
                      <div className="shrink-0 text-end tabular-nums">
                        <p className="text-sm font-bold">{formatBitacoraHours(slice.value)} h</p>
                        <p className="text-xs text-muted-foreground">{slice.pct}%</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="min-w-0 border-border shadow-sm xl:col-span-3">
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="text-sm font-semibold sm:text-base">
                  Evolución mensual
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Horas acumuladas por mes dentro del período filtrado
                </CardDescription>
              </CardHeader>
              <CardContent className="min-w-0 px-2 pb-3 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
                {trendData.length > 0 ? (
                  <div className="dashboard-chart h-[220px] w-full min-w-0 sm:h-[260px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                      <BarChart data={trendData} margin={CHART_MARGIN}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={36}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) =>
                            typeof v === 'number' ? formatBitacoraHours(v) : String(v)
                          }
                        />
                        <Tooltip
                          formatter={hoursTooltipFormatter}
                          contentStyle={{
                            borderRadius: 10,
                            borderColor: 'hsl(214 32% 91%)',
                            fontSize: 12,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                        <Bar
                          dataKey="facturables"
                          name="Facturables"
                          stackId="hours"
                          fill={BITACORA_BILLABLE_CHART_COLOR}
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          dataKey="noFacturables"
                          name="No facturables"
                          stackId="hours"
                          fill={BITACORA_NON_BILLABLE_CHART_COLOR}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No hay suficientes datos mensuales para graficar.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-2">
            <Card className="min-w-0 border-border shadow-sm">
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="text-sm font-semibold sm:text-base">
                  Horas por usuario
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Horas imputadas por cada integrante del equipo en el período
                </CardDescription>
              </CardHeader>
              <CardContent className="min-w-0 px-2 pb-3 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
                {userData.length > 0 ? (
                  <>
                    <div
                      className="dashboard-chart w-full min-w-0"
                      style={{ height: Math.max(200, userData.length * 44) }}
                    >
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                        <BarChart data={userData} layout="vertical" margin={VERTICAL_BAR_CHART_MARGIN}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}h`} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={userYAxisWidth}
                            tick={{ fontSize: 10, fill: 'currentColor' }}
                          />
                          <Tooltip
                            formatter={hoursTooltipFormatter}
                            labelFormatter={(_, payload) => {
                              const item = payload?.[0]?.payload as
                                | { name?: string; entries?: number }
                                | undefined
                              const entries = item?.entries ?? 0
                              const suffix =
                                entries === 1 ? '1 registro' : `${entries} registros`
                              return `${item?.name ?? ''} · ${suffix}`
                            }}
                            contentStyle={{
                              borderRadius: 10,
                              borderColor: 'hsl(214 32% 91%)',
                              fontSize: 12,
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                          <Bar dataKey="facturables" name="Facturables" stackId="u" fill={BITACORA_BILLABLE_CHART_COLOR} />
                          <Bar dataKey="noFacturables" name="No facturables" stackId="u" fill={BITACORA_NON_BILLABLE_CHART_COLOR} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="mt-4 divide-y divide-border/60 rounded-lg border border-border/70">
                      {userData.map((user) => (
                        <li
                          key={user.userId || user.name}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                        >
                          <span className="min-w-0 truncate font-medium">{user.name}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {formatBitacoraHours(user.total)} h
                            <span className="mx-1.5 text-border">·</span>
                            {user.entries} reg.
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Sin horas imputadas por usuarios en el período.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0 border-border shadow-sm">
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                <CardTitle className="text-sm font-semibold sm:text-base">
                  Horas por solicitud
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Principales solicitudes del período
                </CardDescription>
              </CardHeader>
              <CardContent className="min-w-0 px-2 pb-3 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
                {solicitudData.length > 0 ? (
                  <div className="dashboard-chart h-[240px] w-full min-w-0 sm:h-[280px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                      <BarChart data={solicitudData} layout="vertical" margin={VERTICAL_BAR_CHART_MARGIN}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}h`} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={solicitudYAxisWidth}
                          tick={{ fontSize: 10, fill: 'currentColor' }}
                        />
                        <Tooltip
                          formatter={hoursTooltipFormatter}
                          labelFormatter={(_, payload) => {
                            const item = payload?.[0]?.payload as { title?: string; name?: string } | undefined
                            return item?.title || item?.name || ''
                          }}
                          contentStyle={{
                            borderRadius: 10,
                            borderColor: 'hsl(214 32% 91%)',
                            fontSize: 12,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                        <Bar dataKey="facturables" name="Facturables" stackId="s" fill={BITACORA_BILLABLE_CHART_COLOR} />
                        <Bar dataKey="noFacturables" name="No facturables" stackId="s" fill={BITACORA_NON_BILLABLE_CHART_COLOR} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Sin solicitudes con horas en el período.
                  </p>
                )}
              </CardContent>
            </Card>

            {companyData.length > 0 ? (
              <Card className="min-w-0 border-border shadow-sm">
                <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                  <CardTitle className="text-sm font-semibold sm:text-base">
                    Horas por empresa
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Distribución entre clientes con actividad registrada
                  </CardDescription>
                </CardHeader>
                <CardContent className="min-w-0 px-2 pb-3 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
                  <div className="dashboard-chart h-[240px] w-full min-w-0 sm:h-[280px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                      <BarChart data={companyData} layout="vertical" margin={VERTICAL_BAR_CHART_MARGIN}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}h`} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={companyYAxisWidth}
                          tick={{ fontSize: 10, fill: 'currentColor' }}
                        />
                        <Tooltip formatter={hoursTooltipFormatter} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                        <Bar dataKey="facturables" name="Facturables" stackId="c" fill={BITACORA_BILLABLE_CHART_COLOR} />
                        <Bar dataKey="noFacturables" name="No facturables" stackId="c" fill={BITACORA_NON_BILLABLE_CHART_COLOR} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="min-w-0 border-border shadow-sm">
                <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-2">
                  <CardTitle className="text-sm font-semibold sm:text-base">
                    Detalle del período
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Indicadores listos para compartir con el cliente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
                  <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Horas facturables
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {formatBitacoraHours(stats.billableHours)} h
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Horas no facturables
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {formatBitacoraHours(stats.nonBillableHours)} h
                    </p>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Filtra por empresa para ver el desglose dedicado a un cliente específico.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  )
}
