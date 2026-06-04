export type DashboardKpiAccent = 'blue' | 'emerald' | 'violet' | 'amber'

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

export type DashboardSnapshot = {
  dateRangeLabel: string
  chartDescription: string
  kpis: DashboardKpi[]
  funnelStages: DashboardFunnelStage[]
  revenueExpenseSeries: DashboardRevenueExpensePoint[]
  pendingActivities: DashboardPendingActivity[]
  recentOpportunities: DashboardRecentOpportunity[]
  revenueBySource: DashboardRevenueSource[]
  tasksByProject: DashboardProjectProgress[]
}
