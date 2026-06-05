import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { DashboardPeriodSelector } from '@/components/dashboard/DashboardPeriodSelector'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { PendingActivitiesCard } from '@/components/dashboard/PendingActivitiesCard'
import { RecentOpportunitiesCard } from '@/components/dashboard/RecentOpportunitiesCard'
import { RevenueBySourceCard } from '@/components/dashboard/RevenueBySourceCard'
import { RevenueExpenseChartCard } from '@/components/dashboard/RevenueExpenseChartCard'
import { SalesFunnelCard } from '@/components/dashboard/SalesFunnelCard'
import { TasksByProjectCard } from '@/components/dashboard/TasksByProjectCard'
import { defaultDashboardPeriod, useDashboardData } from '@/hooks/use-dashboard-data'
import { cn } from '@/lib/utils'

const dashboardCardClass =
  'border-border shadow-sm max-sm:rounded-2xl max-sm:shadow-md max-sm:ring-1 max-sm:ring-border/60'

export function DashboardPage() {
  const [period, setPeriod] = useState(defaultDashboardPeriod)
  const { data, loading, error, fromApi } = useDashboardData(period)

  if (loading || !data) {
    return (
      <PageScrollArea className="flex min-h-[50vh] items-center justify-center p-6">
        <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
        <span className="sr-only">Cargando dashboard…</span>
      </PageScrollArea>
    )
  }

  const oppKpi = data.kpis.find((k) => k.id === 'opportunities')
  const revKpi = data.kpis.find((k) => k.id === 'revenue')
  const heroChange =
    oppKpi && oppKpi.changePercent !== 0
      ? `${oppKpi.changePercent > 0 ? '+' : ''}${oppKpi.changePercent}% oportunidades`
      : `${data.kpis[0]?.value ?? '—'} oportunidades activas`
  const heroRevenue = revKpi?.value ?? '—'

  return (
    <PageScrollArea className="mx-auto w-full max-w-full min-w-0 space-y-4 overflow-x-clip p-3 pb-8 sm:space-y-6 sm:p-6 lg:pb-10">
      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {error} Se muestran datos de respaldo.
        </p>
      ) : null}

      <section
        className={cn(
          'relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-chart-5/10 p-4 shadow-md sm:hidden',
        )}
      >
        <div className="pointer-events-none absolute -end-6 -top-6 size-28 rounded-full bg-primary/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-4 start-8 size-20 rounded-full bg-chart-5/25 blur-xl" />
        <div className="relative min-w-0 space-y-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles aria-hidden className="size-3.5" />
            Resumen del día
          </p>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Tu pipeline en tiempo real
          </h1>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {heroChange} y {heroRevenue} en ingresos facturados.
          </p>
        </div>
        <DashboardPeriodSelector
          value={period}
          onChange={setPeriod}
          disabled={loading}
          className="relative mt-3 h-8 w-full border-primary/25 bg-background/80 text-xs backdrop-blur-sm"
        />
      </section>

      <div className="hidden flex-col gap-4 sm:flex sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Dashboard
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {fromApi
              ? 'Resumen comercial agregado desde la base de datos.'
              : 'Resumen comercial — datos de demostración.'}
          </p>
        </div>
        <DashboardPeriodSelector
          value={period}
          onChange={setPeriod}
          disabled={loading}
        />
      </div>

      <KpiGrid items={data.kpis} />

      <section className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-3">
        <div className="min-h-0 min-w-0 xl:col-span-2">
          <SalesFunnelCard stages={data.funnelStages} className={dashboardCardClass} />
        </div>
        <div className="min-h-0 min-w-0 xl:col-span-1">
          <RevenueExpenseChartCard
            series={data.revenueExpenseSeries}
            description={data.chartDescription}
            className={dashboardCardClass}
          />
        </div>
      </section>

      <section className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-2">
        <div className="min-w-0">
          <PendingActivitiesCard
            items={data.pendingActivities}
            className={dashboardCardClass}
          />
        </div>
        <div className="min-w-0">
          <RecentOpportunitiesCard
            items={data.recentOpportunities}
            className={dashboardCardClass}
          />
        </div>
      </section>

      <section className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-2">
        <div className="min-w-0">
          <RevenueBySourceCard slices={data.revenueBySource} className={dashboardCardClass} />
        </div>
        <div className="min-w-0">
          <TasksByProjectCard items={data.tasksByProject} className={dashboardCardClass} />
        </div>
      </section>
    </PageScrollArea>
  )
}
