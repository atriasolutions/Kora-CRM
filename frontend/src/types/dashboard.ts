export type DashboardViewId = 'ventas' | 'operaciones' | 'abastecimiento'

export type KpiAccent = 'blue' | 'emerald' | 'violet' | 'amber'

export type KpiDatum = {
  id: string
  title: string
  value: string
  changePercent: number
  subtitle: string
  accent: KpiAccent
}

export type FunnelStage = { label: string; value: number }

export type RevenueExpensePoint = {
  month: string
  ingresos: number
  gastos: number
}

export type PendingActivityItem = {
  id: string
  title: string
  company: string
  timeLabel: string
  icon?: 'call' | 'mail' | 'meeting'
}

export type RecentOpportunity = {
  id: string
  name: string
  company: string
  status: string
  amountLabel: string
}

export type RevenueSourceDatum = {
  name: string
  value: number
  pct: number
  color: string
}

export type ProjectTaskDatum = {
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

export type DashboardData = {
  view: DashboardViewId
  dateRangeLabel: string
  chartDescription?: string
  kpis: KpiDatum[]
  funnelStages?: FunnelStage[]
  revenueExpenseSeries?: RevenueExpensePoint[]
  pendingActivities?: PendingActivityItem[]
  recentOpportunities?: RecentOpportunity[]
  revenueBySource?: RevenueSourceDatum[]
  tasksByProject?: ProjectTaskDatum[]
  barChart?: {
    title: string
    description?: string
    items: DashboardBarDatum[]
  }
  donutChart?: {
    title: string
    description?: string
    slices: RevenueSourceDatum[]
    centerLabel?: string
  }
  timeSeries?: {
    title: string
    description?: string
    series: DashboardTimeSeriesPoint[]
    lines: DashboardTimeSeriesLine[]
  }
  listSection?: {
    title: string
    description?: string
    items: DashboardListItem[]
  }
  progressSection?: {
    title: string
    description?: string
    items: ProjectTaskDatum[]
  }
  topProducts?: DashboardProductSalesSection
  bottomProducts?: DashboardProductSalesSection
}
