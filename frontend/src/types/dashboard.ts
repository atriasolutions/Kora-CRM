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

export type DashboardData = {
  dateRangeLabel: string
  chartDescription?: string
  kpis: KpiDatum[]
  funnelStages: FunnelStage[]
  revenueExpenseSeries: RevenueExpensePoint[]
  pendingActivities: PendingActivityItem[]
  recentOpportunities: RecentOpportunity[]
  revenueBySource: RevenueSourceDatum[]
  tasksByProject: ProjectTaskDatum[]
}
