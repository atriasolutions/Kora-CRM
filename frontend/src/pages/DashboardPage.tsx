import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { AbastecimientoDashboardView } from '@/components/dashboard/AbastecimientoDashboardView'
import { DashboardPeriodSelector } from '@/components/dashboard/DashboardPeriodSelector'
import {
  DashboardViewSwitcher,
  dashboardViewMeta,
} from '@/components/dashboard/DashboardViewSwitcher'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { OperacionesDashboardView } from '@/components/dashboard/OperacionesDashboardView'
import { VentasDashboardView } from '@/components/dashboard/VentasDashboardView'
import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { defaultDashboardPeriod, useDashboardData } from '@/hooks/use-dashboard-data'
import { cn } from '@/lib/utils'
import type { DashboardViewId } from '@/types/dashboard'

export function DashboardPage() {
  const [period, setPeriod] = useState(defaultDashboardPeriod)
  const [view, setView] = useState<DashboardViewId>('ventas')
  const { data, loading, fromApi } = useDashboardData(period, view)
  const viewMeta = dashboardViewMeta(view)

  if (loading || !data) {
    return (
      <PageScrollArea className="flex min-h-[50vh] items-center justify-center p-6">
        <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
        <span className="sr-only">Cargando dashboard…</span>
      </PageScrollArea>
    )
  }

  const heroKpi = data.kpis[0]
  const heroChange =
    heroKpi && heroKpi.changePercent !== 0
      ? `${heroKpi.changePercent > 0 ? '+' : ''}${heroKpi.changePercent}% ${heroKpi.title.toLowerCase()}`
      : `${heroKpi?.value ?? '—'} ${heroKpi?.title.toLowerCase() ?? ''}`

  return (
    <PageScrollArea className="mx-auto w-full max-w-full min-w-0 space-y-4 overflow-x-clip p-3 pb-8 sm:space-y-6 sm:p-6 lg:pb-10">
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
            {viewMeta.label}
          </p>
          <h1 className="text-lg font-bold tracking-tight text-foreground">{viewMeta.description}</h1>
          <p className="text-xs leading-relaxed text-muted-foreground">{heroChange}</p>
        </div>
        <div className="relative mt-3 space-y-2">
          <DashboardViewSwitcher value={view} onChange={setView} />
          <DashboardPeriodSelector
            value={period}
            onChange={setPeriod}
            disabled={loading}
            className="h-8 w-full border-primary/25 bg-background/80 text-xs backdrop-blur-sm"
          />
        </div>
      </section>

      <div className="hidden flex-col gap-4 sm:flex">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Dashboard · {viewMeta.label}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {fromApi
                ? `${viewMeta.description} — datos agregados desde la base de datos.`
                : `${viewMeta.description} — modo demostración (sin API).`}
            </p>
          </div>
          <DashboardPeriodSelector
            value={period}
            onChange={setPeriod}
            disabled={loading}
            className="shrink-0"
          />
        </div>
        <DashboardViewSwitcher value={view} onChange={setView} />
      </div>

      <KpiGrid items={data.kpis} />

      {view === 'ventas' ? <VentasDashboardView data={data} /> : null}
      {view === 'operaciones' ? <OperacionesDashboardView data={data} /> : null}
      {view === 'abastecimiento' ? <AbastecimientoDashboardView data={data} /> : null}
    </PageScrollArea>
  )
}
