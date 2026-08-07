export type DashboardViewId = 'ventas' | 'operaciones' | 'abastecimiento'

export type DashboardKpiAccent = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose'

export type DashboardKpi = {
  id: string
  title: string
  value: string
  changePercent: number
  subtitle: string
  accent: DashboardKpiAccent
}

export type DashboardFunnelStage = {
  label: string
  value: number
}

export type DashboardRevenueExpensePoint = {
  month: string
  ingresos: number
  gastos: number
}

export type DashboardPendingActivity = {
  id: string
  title: string
  company: string
  timeLabel: string
  icon?: 'call' | 'mail' | 'meeting'
}

export type DashboardRecentOpportunity = {
  id: string
  name: string
  company: string
  status: string
  amountLabel: string
}

export type DashboardRevenueSource = {
  name: string
  value: number
  pct: number
  color: string
}

export type DashboardProjectProgress = {
  id: string
  name: string
  pct: number
}

export type DashboardBarDatum = {
  label: string
  value: number
  color?: string
}

export type DashboardListItem = {
  id: string
  title: string
  subtitle?: string
  meta?: string
  badge?: string
  href?: string
}

export type DashboardProductSalesItem = {
  id: string
  name: string
  sku?: string
  quantity: number
}

export type DashboardProductSalesSection = {
  title: string
  description?: string
  items: DashboardProductSalesItem[]
}

export type DashboardTimeSeriesPoint = {
  label: string
  [seriesKey: string]: string | number
}

export type DashboardTimeSeriesLine = {
  key: string
  label: string
  color: string
}

export type DashboardChartSection<T> = {
  title: string
  description?: string
} & T

export type DashboardSnapshot = {
  view: DashboardViewId
  dateRangeLabel: string
  chartDescription: string
  kpis: DashboardKpi[]
  funnelStages?: DashboardFunnelStage[]
  revenueExpenseSeries?: DashboardRevenueExpensePoint[]
  pendingActivities?: DashboardPendingActivity[]
  recentOpportunities?: DashboardRecentOpportunity[]
  revenueBySource?: DashboardRevenueSource[]
  tasksByProject?: DashboardProjectProgress[]
  barChart?: DashboardChartSection<{ items: DashboardBarDatum[] }>
  donutChart?: DashboardChartSection<{
    slices: DashboardRevenueSource[]
    centerLabel?: string
  }>
  timeSeries?: DashboardChartSection<{
    series: DashboardTimeSeriesPoint[]
    lines: DashboardTimeSeriesLine[]
  }>
  listSection?: DashboardChartSection<{ items: DashboardListItem[] }>
  progressSection?: DashboardChartSection<{ items: DashboardProjectProgress[] }>
  topProducts?: DashboardProductSalesSection
  bottomProducts?: DashboardProductSalesSection
}

/** Alias para compatibilidad con respuestas por vista. */
export type DashboardViewSnapshot = DashboardSnapshot
