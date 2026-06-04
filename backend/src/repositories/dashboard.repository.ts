import {
  buildDashboardDateRangeLabel,
  chartDescriptionForPeriod,
  defaultDashboardPeriod,
  getPeriodRanges,
  type DashboardPeriod,
} from '../lib/dashboard-period.js'
import { pool } from '../db/pool.js'
import type {
  DashboardFunnelStage,
  DashboardKpi,
  DashboardPendingActivity,
  DashboardProjectProgress,
  DashboardRecentOpportunity,
  DashboardRevenueExpensePoint,
  DashboardRevenueSource,
  DashboardSnapshot,
} from '../types/dashboard.js'
import { formatActivityLabel } from '../utils/format.js'
import { formatCentsToMoney } from '../utils/money.js'

const FUNNEL_STAGE_LABELS = [
  'Calificados',
  'En diagnóstico',
  'Propuesta',
  'Negociación',
  'Cerrada',
] as const

const REVENUE_SOURCE_COLORS = [
  'hsl(217 91% 55%)',
  'hsl(142 76% 45%)',
  'hsl(262 83% 58%)',
  'hsl(27 96% 61%)',
  'hsl(199 89% 48%)',
  'hsl(340 82% 52%)',
]

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatCompactMoney(cents: number): string {
  const amount = cents / 100
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 1 })}M`
  }
  if (amount >= 1_000) {
    return `$${Math.round(amount / 1_000)}k`
  }
  return formatCentsToMoney(cents)
}

function pctChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function activityIcon(type: string | null): DashboardPendingActivity['icon'] {
  const t = (type ?? '').toLowerCase()
  if (t.includes('mail') || t.includes('email')) return 'mail'
  if (t.includes('reunion') || t.includes('reunión') || t.includes('meeting')) return 'meeting'
  return 'call'
}

function mapOpportunityStatus(stage: string): string {
  const normalized = stage.trim()
  if (
    normalized === 'Propuesta' ||
    normalized === 'Negociación' ||
    normalized === 'Calificados'
  ) {
    return normalized
  }
  if (normalized === 'Cerrada' || normalized === 'Ganada') return 'Negociación'
  return 'Calificados'
}

async function loadRevenueExpenseSeries(
  period: DashboardPeriod,
  now: Date,
): Promise<DashboardRevenueExpensePoint[]> {
  if (period.mode === 'years') {
    const endYear = now.getFullYear()
    const startYear = endYear - 4
    const chartStart = toDateParam(new Date(startYear, 0, 1))
    const chartEnd = toDateParam(new Date(endYear, 11, 31))

    const [revenueRows, expenseRows] = await Promise.all([
      pool.query<{ year: number; total: string }>(
        `SELECT extract(year from issue_date)::int AS year,
                coalesce(sum(amount_cents), 0)::text AS total
         FROM crm_invoices
         WHERE deleted_at IS NULL AND archived_at IS NULL
           AND lower(trim(status::text)) = 'pagada'
           AND issue_date >= $1::date AND issue_date <= $2::date
         GROUP BY 1 ORDER BY 1`,
        [chartStart, chartEnd],
      ),
      pool.query<{ year: number; total: string }>(
        `SELECT extract(year from order_date)::int AS year,
                coalesce(sum(amount_cents), 0)::text AS total
         FROM crm_purchases
         WHERE deleted_at IS NULL AND archived_at IS NULL
           AND order_date >= $1::date AND order_date <= $2::date
         GROUP BY 1 ORDER BY 1`,
        [chartStart, chartEnd],
      ),
    ])

    const revenueMap = new Map(
      revenueRows.rows.map((r) => [r.year, Number.parseInt(r.total, 10) / 100]),
    )
    const expenseMap = new Map(
      expenseRows.rows.map((r) => [r.year, Number.parseInt(r.total, 10) / 100]),
    )

    const series: DashboardRevenueExpensePoint[] = []
    for (let y = startYear; y <= endYear; y += 1) {
      series.push({
        month: String(y),
        ingresos: revenueMap.get(y) ?? 0,
        gastos: expenseMap.get(y) ?? 0,
      })
    }
    return series
  }

  if (period.mode === 'year') {
    const chartStart = toDateParam(new Date(period.year, 0, 1))
    const chartEnd = toDateParam(new Date(period.year, 11, 31))

    const [revenueRows, expenseRows] = await Promise.all([
      pool.query<{ month: Date; total: string }>(
        `SELECT date_trunc('month', issue_date)::date AS month,
                coalesce(sum(amount_cents), 0)::text AS total
         FROM crm_invoices
         WHERE deleted_at IS NULL AND archived_at IS NULL
           AND lower(trim(status::text)) = 'pagada'
           AND issue_date >= $1::date AND issue_date <= $2::date
         GROUP BY 1 ORDER BY 1`,
        [chartStart, chartEnd],
      ),
      pool.query<{ month: Date; total: string }>(
        `SELECT date_trunc('month', order_date)::date AS month,
                coalesce(sum(amount_cents), 0)::text AS total
         FROM crm_purchases
         WHERE deleted_at IS NULL AND archived_at IS NULL
           AND order_date >= $1::date AND order_date <= $2::date
         GROUP BY 1 ORDER BY 1`,
        [chartStart, chartEnd],
      ),
    ])

    const revenueMap = new Map(
      revenueRows.rows.map((r) => [new Date(r.month).getMonth(), Number.parseInt(r.total, 10) / 100]),
    )
    const expenseMap = new Map(
      expenseRows.rows.map((r) => [new Date(r.month).getMonth(), Number.parseInt(r.total, 10) / 100]),
    )

    return MONTH_LABELS.map((label, idx) => ({
      month: label,
      ingresos: revenueMap.get(idx) ?? 0,
      gastos: expenseMap.get(idx) ?? 0,
    }))
  }

  const anchor = new Date(period.year, period.month, 1)
  const windowStart = new Date(anchor.getFullYear(), anchor.getMonth() - 5, 1)
  const windowEnd = new Date(period.year, period.month + 1, 0)
  const chartStart = toDateParam(windowStart)
  const chartEnd = toDateParam(windowEnd)

  const [revenueRows, expenseRows] = await Promise.all([
    pool.query<{ month: Date; total: string }>(
      `SELECT date_trunc('month', issue_date)::date AS month,
              coalesce(sum(amount_cents), 0)::text AS total
       FROM crm_invoices
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND lower(trim(status::text)) = 'pagada'
         AND issue_date >= $1::date AND issue_date <= $2::date
       GROUP BY 1 ORDER BY 1`,
      [chartStart, chartEnd],
    ),
    pool.query<{ month: Date; total: string }>(
      `SELECT date_trunc('month', order_date)::date AS month,
              coalesce(sum(amount_cents), 0)::text AS total
       FROM crm_purchases
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND order_date >= $1::date AND order_date <= $2::date
       GROUP BY 1 ORDER BY 1`,
      [chartStart, chartEnd],
    ),
  ])

  const revenueMap = new Map<string, number>(
    revenueRows.rows.map((r) => {
      const d = new Date(r.month)
      return [`${d.getFullYear()}-${d.getMonth()}`, Number.parseInt(r.total, 10) / 100]
    }),
  )
  const expenseMap = new Map<string, number>(
    expenseRows.rows.map((r) => {
      const d = new Date(r.month)
      return [`${d.getFullYear()}-${d.getMonth()}`, Number.parseInt(r.total, 10) / 100]
    }),
  )

  const series: DashboardRevenueExpensePoint[] = []
  for (let i = 0; i < 6; i += 1) {
    const d = new Date(windowStart.getFullYear(), windowStart.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const monthIdx = d.getMonth()
    series.push({
      month: MONTH_LABELS[monthIdx] ?? '—',
      ingresos: revenueMap.get(key) ?? 0,
      gastos: expenseMap.get(key) ?? 0,
    })
  }
  return series
}

export async function getDashboardSnapshot(
  period: DashboardPeriod = defaultDashboardPeriod(),
): Promise<DashboardSnapshot> {
  const now = new Date()
  const { rangeStart, rangeEnd, prevRangeStart, prevRangeEnd, compareLabel } =
    getPeriodRanges(period, now)
  const rangeStartIso = toDateParam(rangeStart)
  const rangeEndIso = toDateParam(rangeEnd)
  const prevStartIso = toDateParam(prevRangeStart)
  const prevEndIso = toDateParam(prevRangeEnd)

  const [
    oppCounts,
    clientCounts,
    activityCounts,
    revenueCounts,
    funnelRows,
    pendingActivityRows,
    recentOppRows,
    revenueSourceRows,
    projectRows,
    revenueExpenseSeries,
  ] = await Promise.all([
    pool.query<{ current: string; previous: string }>(
      `SELECT
        count(*) FILTER (
          WHERE deleted_at IS NULL AND archived_at IS NULL
            AND created_at >= $1 AND created_at <= $2
        )::text AS current,
        count(*) FILTER (
          WHERE deleted_at IS NULL AND archived_at IS NULL
            AND created_at >= $3 AND created_at <= $4
        )::text AS previous
       FROM crm_opportunities`,
      [rangeStart, rangeEnd, prevRangeStart, prevRangeEnd],
    ),
    pool.query<{ current: string; previous: string }>(
      `SELECT
        count(*) FILTER (
          WHERE deleted_at IS NULL AND archived_at IS NULL
            AND lower(trim(status::text)) = 'cliente'
            AND created_at >= $1 AND created_at <= $2
        )::text AS current,
        count(*) FILTER (
          WHERE deleted_at IS NULL AND archived_at IS NULL
            AND lower(trim(status::text)) = 'cliente'
            AND created_at >= $3 AND created_at <= $4
        )::text AS previous
       FROM crm_contacts`,
      [rangeStart, rangeEnd, prevRangeStart, prevRangeEnd],
    ),
    pool.query<{ current: string; previous: string }>(
      `SELECT
        count(*) FILTER (
          WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2
        )::text AS current,
        count(*) FILTER (
          WHERE deleted_at IS NULL AND created_at >= $3 AND created_at <= $4
        )::text AS previous
       FROM crm_activities`,
      [rangeStart, rangeEnd, prevRangeStart, prevRangeEnd],
    ),
    pool.query<{ current: string; previous: string }>(
      `SELECT
        coalesce(sum(amount_cents) FILTER (
          WHERE deleted_at IS NULL AND archived_at IS NULL
            AND lower(trim(status::text)) = 'pagada'
            AND issue_date >= $1::date AND issue_date <= $2::date
        ), 0)::text AS current,
        coalesce(sum(amount_cents) FILTER (
          WHERE deleted_at IS NULL AND archived_at IS NULL
            AND lower(trim(status::text)) = 'pagada'
            AND issue_date >= $3::date AND issue_date <= $4::date
        ), 0)::text AS previous
       FROM crm_invoices`,
      [rangeStartIso, rangeEndIso, prevStartIso, prevEndIso],
    ),
    pool.query<{ stage: string; count: string }>(
      `SELECT trim(stage::text) AS stage, count(*)::text AS count
       FROM crm_opportunities
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND created_at >= $1 AND created_at <= $2
       GROUP BY trim(stage::text)`,
      [rangeStart, rangeEnd],
    ),
    pool.query<{
      id: string
      title: string
      company_name: string | null
      scheduled_at: Date | string | null
      activity_type: string | null
    }>(
      `SELECT id, title, company_name, scheduled_at, activity_type
       FROM crm_activities
       WHERE deleted_at IS NULL
         AND status IN ('Pendiente', 'En curso')
       ORDER BY scheduled_at ASC NULLS LAST, created_at ASC
       LIMIT 4`,
    ),
    pool.query<{
      id: string
      name: string
      company_name: string | null
      stage: string
      amount_cents: string
    }>(
      `SELECT id, name, company_name, stage, amount_cents::text
       FROM crm_opportunities
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND created_at >= $1 AND created_at <= $2
       ORDER BY updated_at DESC
       LIMIT 4`,
      [rangeStart, rangeEnd],
    ),
    pool.query<{ source: string; total: string }>(
      `SELECT coalesce(nullif(trim(source), ''), 'Sin origen') AS source,
              coalesce(sum(amount_cents), 0)::text AS total
       FROM crm_opportunities
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND created_at >= $1 AND created_at <= $2
       GROUP BY 1
       ORDER BY sum(amount_cents) DESC
       LIMIT 6`,
      [rangeStart, rangeEnd],
    ),
    pool.query<{ id: string; name: string; progress_pct: number | null }>(
      `SELECT id, name, progress_pct
       FROM crm_projects
       WHERE deleted_at IS NULL AND archived_at IS NULL
       ORDER BY updated_at DESC
       LIMIT 4`,
    ),
    loadRevenueExpenseSeries(period, now),
  ])

  const oppCurrent = Number.parseInt(oppCounts.rows[0]?.current ?? '0', 10)
  const oppPrevious = Number.parseInt(oppCounts.rows[0]?.previous ?? '0', 10)
  const clientCurrent = Number.parseInt(clientCounts.rows[0]?.current ?? '0', 10)
  const clientPrevious = Number.parseInt(clientCounts.rows[0]?.previous ?? '0', 10)
  const actCurrent = Number.parseInt(activityCounts.rows[0]?.current ?? '0', 10)
  const actPrevious = Number.parseInt(activityCounts.rows[0]?.previous ?? '0', 10)
  const revCurrent = Number.parseInt(revenueCounts.rows[0]?.current ?? '0', 10)
  const revPrevious = Number.parseInt(revenueCounts.rows[0]?.previous ?? '0', 10)

  const kpis: DashboardKpi[] = [
    {
      id: 'opportunities',
      title: 'Oportunidades',
      value: String(oppCurrent),
      changePercent: pctChange(oppCurrent, oppPrevious),
      subtitle: compareLabel,
      accent: 'blue',
    },
    {
      id: 'revenue',
      title: 'Ingresos',
      value: formatCompactMoney(revCurrent),
      changePercent: pctChange(revCurrent, revPrevious),
      subtitle: compareLabel,
      accent: 'emerald',
    },
    {
      id: 'newClients',
      title: 'Clientes nuevos',
      value: String(clientCurrent),
      changePercent: pctChange(clientCurrent, clientPrevious),
      subtitle: compareLabel,
      accent: 'violet',
    },
    {
      id: 'activities',
      title: 'Actividades',
      value: String(actCurrent),
      changePercent: pctChange(actCurrent, actPrevious),
      subtitle: compareLabel,
      accent: 'amber',
    },
  ]

  const funnelMap = new Map(
    funnelRows.rows.map((row) => [row.stage, Number.parseInt(row.count, 10)]),
  )
  const funnelStages: DashboardFunnelStage[] = FUNNEL_STAGE_LABELS.map((label) => ({
    label,
    value: funnelMap.get(label) ?? 0,
  }))

  const pendingActivities: DashboardPendingActivity[] = pendingActivityRows.rows.map(
    (row) => ({
      id: row.id,
      title: row.title,
      company: row.company_name?.trim() || '—',
      timeLabel: formatActivityLabel(row.scheduled_at),
      icon: activityIcon(row.activity_type),
    }),
  )

  const recentOpportunities: DashboardRecentOpportunity[] = recentOppRows.rows.map(
    (row) => ({
      id: row.id,
      name: row.name,
      company: row.company_name?.trim() || '—',
      status: mapOpportunityStatus(row.stage),
      amountLabel: formatCentsToMoney(Number.parseInt(row.amount_cents, 10)),
    }),
  )

  const revenueSourceTotal = revenueSourceRows.rows.reduce(
    (sum, row) => sum + Number.parseInt(row.total, 10),
    0,
  )
  const revenueBySource: DashboardRevenueSource[] = revenueSourceRows.rows.map(
    (row, index) => {
      const value = Number.parseInt(row.total, 10) / 100
      const pct =
        revenueSourceTotal > 0
          ? Math.round((Number.parseInt(row.total, 10) / revenueSourceTotal) * 1000) / 10
          : 0
      return {
        name: row.source,
        value,
        pct,
        color: REVENUE_SOURCE_COLORS[index % REVENUE_SOURCE_COLORS.length]!,
      }
    },
  )

  const tasksByProject: DashboardProjectProgress[] = projectRows.rows.map((row) => ({
    id: row.id,
    name: row.name,
    pct: Math.min(100, Math.max(0, Math.round(row.progress_pct ?? 0))),
  }))

  return {
    dateRangeLabel: buildDashboardDateRangeLabel(period),
    chartDescription: chartDescriptionForPeriod(period),
    kpis,
    funnelStages,
    revenueExpenseSeries,
    pendingActivities,
    recentOpportunities,
    revenueBySource,
    tasksByProject,
  }
}
