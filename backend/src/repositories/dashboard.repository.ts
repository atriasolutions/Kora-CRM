import {
  buildDashboardDateRangeLabel,
  chartDescriptionForPeriod,
  defaultDashboardPeriod,
  getPeriodRanges,
  type DashboardPeriod,
} from '../lib/dashboard-period.js'
import { chilePartsFromDate } from '../lib/chile-timezone.js'
import { tenantQuery } from '../db/tenant-query.js'
import { getTenantIdOrDefault } from '../lib/tenant-context.js'
import type {
  DashboardFunnelStage,
  DashboardKpi,
  DashboardPendingActivity,
  DashboardProjectProgress,
  DashboardRecentOpportunity,
  DashboardRevenueExpensePoint,
  DashboardRevenueSource,
  DashboardSnapshot,
  DashboardViewId,
} from '../types/dashboard.js'
import { formatActivityLabel } from '../utils/format.js'
import { formatCentsToMoney } from '../utils/money.js'

function dashTenantFilter(tableAlias?: string): string {
  const col = tableAlias ? `${tableAlias}.tenant_id` : 'tenant_id'
  return `${col} = '${getTenantIdOrDefault()}'`
}

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

/**
 * Facturado comercial en centavos:
 * - Facturas/ND emitidas (Pendiente/Pagada/Vencida) suman
 * - Notas de crédito emitidas restan
 * - Borrador / Anulada no cuentan
 */
const INVOICE_BILLED_CENTS_EXPR = `
  CASE
    WHEN coalesce(document_kind::text, 'invoice') = 'credit_note'
      AND status::text NOT IN ('Borrador', 'Anulada')
      THEN -amount_cents
    WHEN coalesce(document_kind::text, 'invoice') IN ('invoice', 'debit_note')
      AND status::text IN ('Pendiente', 'Pagada', 'Vencida')
      THEN amount_cents
    ELSE 0
  END
`

/** Facturas emitidas + boletas Emitida (misma base que el KPI Ingresos). */
function revenueSeriesSql(bucketExpr: string): string {
  return `
    SELECT ${bucketExpr} AS bucket, coalesce(sum(amount_cents), 0)::text AS total
    FROM (
      SELECT issue_date, (${INVOICE_BILLED_CENTS_EXPR}) AS amount_cents
      FROM crm_invoices
      WHERE deleted_at IS NULL AND archived_at IS NULL
        AND issue_date >= $1::date AND issue_date <= $2::date
        AND ${dashTenantFilter()}
      UNION ALL
      SELECT issue_date, amount_cents
      FROM crm_boletas
      WHERE deleted_at IS NULL AND archived_at IS NULL
        AND status::text = 'Emitida'
        AND issue_date >= $1::date AND issue_date <= $2::date
        AND ${dashTenantFilter()}
    ) billed
    GROUP BY 1 ORDER BY 1
  `
}

function formatCompactMoney(cents: number): string {
  const amount = cents / 100
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000
    const rounded =
      millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10
    const label = Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(1).replace('.', ',')
    return `${sign}$${label}M`
  }
  if (abs >= 10_000) {
    return `${sign}$${Math.round(abs / 1_000)}k`
  }
  if (abs >= 1_000) {
    const thousands = abs / 1_000
    const rounded = Math.round(thousands * 10) / 10
    const label = Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(1).replace('.', ',')
    return `${sign}$${label}k`
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

/** Etapa real para UI (sin disfrazar cerradas como negociación). */
function displayOpportunityStage(stage: string): string {
  const normalized = stage.trim()
  return normalized || '—'
}

/**
 * Agrupa etapas off-route en el embudo principal.
 * Perdida / No calificada no inflan Negociación.
 */
function mapToFunnelStage(stage: string): (typeof FUNNEL_STAGE_LABELS)[number] | null {
  const normalized = stage.trim()
  if (normalized === 'Calificados') return 'Calificados'
  if (normalized === 'En diagnóstico') return 'En diagnóstico'
  if (normalized === 'Propuesta') return 'Propuesta'
  if (
    normalized === 'Negociación' ||
    normalized === 'En espera cliente' ||
    normalized === 'Pausada internamente'
  ) {
    return 'Negociación'
  }
  if (normalized === 'Cerrada' || normalized === 'Ganada') return 'Cerrada'
  return null
}

function monthKeyFromPgDate(value: Date | string): { year: number; month0: number } {
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})/.exec(value)
    if (match) {
      return { year: Number(match[1]), month0: Number(match[2]) - 1 }
    }
  }
  const d = value instanceof Date ? value : new Date(value)
  return { year: d.getUTCFullYear(), month0: d.getUTCMonth() }
}

function dayKeyFromPgDate(value: Date | string): string {
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (match) return match[0]
  }
  const d = value instanceof Date ? value : new Date(value)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function loadRevenueExpenseSeries(
  period: DashboardPeriod,
  now: Date,
): Promise<DashboardRevenueExpensePoint[]> {
  if (period.mode === 'years') {
    const endYear = chilePartsFromDate(now).year
    const startYear = endYear - 4
    const chartStart = `${startYear}-01-01`
    const chartEnd = `${endYear}-12-31`

    const [revenueRows, expenseRows] = await Promise.all([
      tenantQuery<{ bucket: number; total: string }>(
        revenueSeriesSql('extract(year from issue_date)::int'),
        [chartStart, chartEnd],
      ),
      tenantQuery<{ year: number; total: string }>(
        `SELECT year, coalesce(sum(amount_cents), 0)::text AS total
         FROM (
           SELECT extract(year from order_date)::int AS year, amount_cents
           FROM crm_purchases
           WHERE deleted_at IS NULL AND archived_at IS NULL
             AND order_date >= $1::date AND order_date <= $2::date
             AND ${dashTenantFilter()}
           UNION ALL
           SELECT extract(year from expense_date)::int AS year, amount_cents
           FROM crm_expenses
           WHERE deleted_at IS NULL AND archived_at IS NULL
             AND status = 'Registrado'
             AND expense_date >= $1::date AND expense_date <= $2::date
             AND ${dashTenantFilter()}
         ) combined
         GROUP BY 1 ORDER BY 1`,
        [chartStart, chartEnd],
      ),
    ])

    const revenueMap = new Map(
      revenueRows.rows.map((r) => [r.bucket, Number.parseInt(r.total, 10) / 100]),
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
    const chartStart = `${period.year}-01-01`
    const chartEnd = `${period.year}-12-31`

    const [revenueRows, expenseRows] = await Promise.all([
      tenantQuery<{ bucket: Date; total: string }>(
        revenueSeriesSql(`date_trunc('month', issue_date)::date`),
        [chartStart, chartEnd],
      ),
      tenantQuery<{ month: Date; total: string }>(
        `SELECT month, coalesce(sum(amount_cents), 0)::text AS total
         FROM (
           SELECT date_trunc('month', order_date)::date AS month, amount_cents
           FROM crm_purchases
           WHERE deleted_at IS NULL AND archived_at IS NULL
             AND order_date >= $1::date AND order_date <= $2::date
             AND ${dashTenantFilter()}
           UNION ALL
           SELECT date_trunc('month', expense_date)::date AS month, amount_cents
           FROM crm_expenses
           WHERE deleted_at IS NULL AND archived_at IS NULL
             AND status = 'Registrado'
             AND expense_date >= $1::date AND expense_date <= $2::date
             AND ${dashTenantFilter()}
         ) combined
         GROUP BY 1 ORDER BY 1`,
        [chartStart, chartEnd],
      ),
    ])

    const revenueMap = new Map(
      revenueRows.rows.map((r) => [
        monthKeyFromPgDate(r.bucket).month0,
        Number.parseInt(r.total, 10) / 100,
      ]),
    )
    const expenseMap = new Map(
      expenseRows.rows.map((r) => [
        monthKeyFromPgDate(r.month).month0,
        Number.parseInt(r.total, 10) / 100,
      ]),
    )

    return MONTH_LABELS.map((label, idx) => ({
      month: label,
      ingresos: revenueMap.get(idx) ?? 0,
      gastos: expenseMap.get(idx) ?? 0,
    }))
  }

  // Modo mes: desglose diario del mes seleccionado (no rolling de 6 meses).
  const lastDay = new Date(Date.UTC(period.year, period.month + 1, 0)).getUTCDate()
  const month1 = String(period.month + 1).padStart(2, '0')
  const chartStart = `${period.year}-${month1}-01`
  const chartEnd = `${period.year}-${month1}-${String(lastDay).padStart(2, '0')}`

  const [revenueRows, expenseRows] = await Promise.all([
    tenantQuery<{ bucket: Date | string; total: string }>(
      revenueSeriesSql(`issue_date::date`),
      [chartStart, chartEnd],
    ),
    tenantQuery<{ bucket: Date | string; total: string }>(
      `SELECT bucket, coalesce(sum(amount_cents), 0)::text AS total
       FROM (
         SELECT order_date::date AS bucket, amount_cents
         FROM crm_purchases
         WHERE deleted_at IS NULL AND archived_at IS NULL
           AND order_date >= $1::date AND order_date <= $2::date
           AND ${dashTenantFilter()}
         UNION ALL
         SELECT expense_date::date AS bucket, amount_cents
         FROM crm_expenses
         WHERE deleted_at IS NULL AND archived_at IS NULL
           AND status = 'Registrado'
           AND expense_date >= $1::date AND expense_date <= $2::date
           AND ${dashTenantFilter()}
       ) combined
       GROUP BY 1 ORDER BY 1`,
      [chartStart, chartEnd],
    ),
  ])

  const revenueMap = new Map(
    revenueRows.rows.map((r) => [
      dayKeyFromPgDate(r.bucket),
      Number.parseInt(r.total, 10) / 100,
    ]),
  )
  const expenseMap = new Map(
    expenseRows.rows.map((r) => [
      dayKeyFromPgDate(r.bucket),
      Number.parseInt(r.total, 10) / 100,
    ]),
  )

  const series: DashboardRevenueExpensePoint[] = []
  for (let day = 1; day <= lastDay; day += 1) {
    const key = `${period.year}-${month1}-${String(day).padStart(2, '0')}`
    series.push({
      month: String(day),
      ingresos: revenueMap.get(key) ?? 0,
      gastos: expenseMap.get(key) ?? 0,
    })
  }
  return series
}

export async function getDashboardSnapshot(
  period: DashboardPeriod = defaultDashboardPeriod(),
  view: DashboardViewId = 'ventas',
): Promise<DashboardSnapshot> {
  if (view === 'operaciones') {
    const { getOperacionesDashboardSnapshot } = await import('./dashboard-views.repository.js')
    return getOperacionesDashboardSnapshot(period)
  }
  if (view === 'abastecimiento') {
    const { getAbastecimientoDashboardSnapshot } = await import('./dashboard-views.repository.js')
    return getAbastecimientoDashboardSnapshot(period)
  }

  const snapshot = await getVentasDashboardSnapshot(period)
  return { ...snapshot, view: 'ventas' }
}

async function getVentasDashboardSnapshot(
  period: DashboardPeriod = defaultDashboardPeriod(),
): Promise<DashboardSnapshot> {
  const now = new Date()
  const {
    rangeStart,
    rangeEndExclusive,
    prevRangeStart,
    prevRangeEndExclusive,
    rangeStartDate,
    rangeEndDate,
    prevRangeStartDate,
    prevRangeEndDate,
    compareLabel,
  } = getPeriodRanges(period, now)

  const [
    oppCounts,
    clientCounts,
    pipelineCounts,
    revenueCounts,
    expenseCounts,
    funnelRows,
    pendingActivityRows,
    recentOppRows,
    revenueSourceRows,
    projectRows,
    revenueExpenseSeries,
  ] = await Promise.all([
    tenantQuery<{ current: string; previous: string }>(
      `SELECT
        count(*) FILTER (
          WHERE deleted_at IS NULL AND archived_at IS NULL
            AND created_at >= $1 AND created_at < $2
        )::text AS current,
        count(*) FILTER (
          WHERE deleted_at IS NULL AND archived_at IS NULL
            AND created_at >= $3 AND created_at < $4
        )::text AS previous
       FROM crm_opportunities
       WHERE ${dashTenantFilter()}`,
      [rangeStart, rangeEndExclusive, prevRangeStart, prevRangeEndExclusive],
    ),
    tenantQuery<{ current: string; previous: string }>(
      `SELECT
        (
          SELECT count(*)::int FROM (
            SELECT c.id::text AS kid
            FROM crm_companies c
            WHERE c.deleted_at IS NULL AND c.archived_at IS NULL
              AND lower(trim(c.lifecycle::text)) = 'cliente'
              AND c.created_at >= $1 AND c.created_at < $2
              AND ${dashTenantFilter('c')}
            UNION
            SELECT ct.id::text
            FROM crm_contacts ct
            WHERE ct.deleted_at IS NULL AND ct.archived_at IS NULL
              AND lower(trim(ct.status::text)) = 'cliente'
              AND ct.created_at >= $1 AND ct.created_at < $2
              AND ${dashTenantFilter('ct')}
            UNION
            SELECT DISTINCT o.company_id::text
            FROM crm_opportunities o
            WHERE o.deleted_at IS NULL AND o.archived_at IS NULL
              AND o.company_id IS NOT NULL
              AND coalesce(o.outcome::text, '') = 'Ganada'
              AND o.updated_at >= $1 AND o.updated_at < $2
              AND ${dashTenantFilter('o')}
          ) nuevos
        )::text AS current,
        (
          SELECT count(*)::int FROM (
            SELECT c.id::text AS kid
            FROM crm_companies c
            WHERE c.deleted_at IS NULL AND c.archived_at IS NULL
              AND lower(trim(c.lifecycle::text)) = 'cliente'
              AND c.created_at >= $3 AND c.created_at < $4
              AND ${dashTenantFilter('c')}
            UNION
            SELECT ct.id::text
            FROM crm_contacts ct
            WHERE ct.deleted_at IS NULL AND ct.archived_at IS NULL
              AND lower(trim(ct.status::text)) = 'cliente'
              AND ct.created_at >= $3 AND ct.created_at < $4
              AND ${dashTenantFilter('ct')}
            UNION
            SELECT DISTINCT o.company_id::text
            FROM crm_opportunities o
            WHERE o.deleted_at IS NULL AND o.archived_at IS NULL
              AND o.company_id IS NOT NULL
              AND coalesce(o.outcome::text, '') = 'Ganada'
              AND o.updated_at >= $3 AND o.updated_at < $4
              AND ${dashTenantFilter('o')}
          ) nuevos_prev
        )::text AS previous`,
      [rangeStart, rangeEndExclusive, prevRangeStart, prevRangeEndExclusive],
    ),
    tenantQuery<{ current: string; previous: string }>(
      `SELECT
        coalesce(sum(amount_cents) FILTER (
          WHERE deleted_at IS NULL AND archived_at IS NULL
            AND coalesce(outcome::text, 'Abierta') = 'Abierta'
            AND created_at >= $1 AND created_at < $2
        ), 0)::text AS current,
        coalesce(sum(amount_cents) FILTER (
          WHERE deleted_at IS NULL AND archived_at IS NULL
            AND coalesce(outcome::text, 'Abierta') = 'Abierta'
            AND created_at >= $3 AND created_at < $4
        ), 0)::text AS previous
       FROM crm_opportunities
       WHERE ${dashTenantFilter()}`,
      [rangeStart, rangeEndExclusive, prevRangeStart, prevRangeEndExclusive],
    ),
    tenantQuery<{ current: string; previous: string }>(
      `SELECT
        (
          coalesce((
            SELECT sum(${INVOICE_BILLED_CENTS_EXPR})
            FROM crm_invoices
            WHERE deleted_at IS NULL AND archived_at IS NULL
              AND issue_date >= $1::date AND issue_date <= $2::date
              AND ${dashTenantFilter()}
          ), 0)
          +
          coalesce((
            SELECT sum(amount_cents)
            FROM crm_boletas
            WHERE deleted_at IS NULL AND archived_at IS NULL
              AND status::text = 'Emitida'
              AND issue_date >= $1::date AND issue_date <= $2::date
              AND ${dashTenantFilter()}
          ), 0)
        )::text AS current,
        (
          coalesce((
            SELECT sum(${INVOICE_BILLED_CENTS_EXPR})
            FROM crm_invoices
            WHERE deleted_at IS NULL AND archived_at IS NULL
              AND issue_date >= $3::date AND issue_date <= $4::date
              AND ${dashTenantFilter()}
          ), 0)
          +
          coalesce((
            SELECT sum(amount_cents)
            FROM crm_boletas
            WHERE deleted_at IS NULL AND archived_at IS NULL
              AND status::text = 'Emitida'
              AND issue_date >= $3::date AND issue_date <= $4::date
              AND ${dashTenantFilter()}
          ), 0)
        )::text AS previous`,
      [rangeStartDate, rangeEndDate, prevRangeStartDate, prevRangeEndDate],
    ),
    // Gastos = compras + gastos operativos Registrado (misma base que el chart).
    tenantQuery<{ current: string; previous: string }>(
      `SELECT
        (
          coalesce((
            SELECT sum(amount_cents)
            FROM crm_purchases
            WHERE deleted_at IS NULL AND archived_at IS NULL
              AND order_date >= $1::date AND order_date <= $2::date
              AND ${dashTenantFilter()}
          ), 0)
          +
          coalesce((
            SELECT sum(amount_cents)
            FROM crm_expenses
            WHERE deleted_at IS NULL AND archived_at IS NULL
              AND status = 'Registrado'
              AND expense_date >= $1::date AND expense_date <= $2::date
              AND ${dashTenantFilter()}
          ), 0)
        )::text AS current,
        (
          coalesce((
            SELECT sum(amount_cents)
            FROM crm_purchases
            WHERE deleted_at IS NULL AND archived_at IS NULL
              AND order_date >= $3::date AND order_date <= $4::date
              AND ${dashTenantFilter()}
          ), 0)
          +
          coalesce((
            SELECT sum(amount_cents)
            FROM crm_expenses
            WHERE deleted_at IS NULL AND archived_at IS NULL
              AND status = 'Registrado'
              AND expense_date >= $3::date AND expense_date <= $4::date
              AND ${dashTenantFilter()}
          ), 0)
        )::text AS previous`,
      [rangeStartDate, rangeEndDate, prevRangeStartDate, prevRangeEndDate],
    ),
    tenantQuery<{ stage: string; count: string }>(
      `SELECT trim(stage::text) AS stage, count(*)::text AS count
       FROM crm_opportunities
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND created_at >= $1 AND created_at < $2
         AND ${dashTenantFilter()}
       GROUP BY trim(stage::text)`,
      [rangeStart, rangeEndExclusive],
    ),
    tenantQuery<{
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
         AND (
           scheduled_at IS NULL
           OR (scheduled_at >= $1 AND scheduled_at < $2)
           OR scheduled_at < $1
         )
         AND ${dashTenantFilter()}
       ORDER BY scheduled_at ASC NULLS LAST, created_at ASC
       LIMIT 4`,
      [rangeStart, rangeEndExclusive],
    ),
    tenantQuery<{
      id: string
      name: string
      company_name: string | null
      stage: string
      amount_cents: string
    }>(
      `SELECT id, name, company_name, stage, amount_cents::text
       FROM crm_opportunities
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND updated_at >= $1 AND updated_at < $2
         AND ${dashTenantFilter()}
       ORDER BY updated_at DESC
       LIMIT 6`,
      [rangeStart, rangeEndExclusive],
    ),
    tenantQuery<{ source: string; total: string }>(
      `SELECT coalesce(nullif(trim(o.source), ''), 'Sin origen') AS source,
              coalesce(sum(
                CASE
                  WHEN coalesce(i.document_kind::text, 'invoice') = 'credit_note'
                    AND i.status::text NOT IN ('Borrador', 'Anulada')
                    THEN -i.amount_cents
                  WHEN coalesce(i.document_kind::text, 'invoice') IN ('invoice', 'debit_note')
                    AND i.status::text IN ('Pendiente', 'Pagada', 'Vencida')
                    THEN i.amount_cents
                  ELSE 0
                END
              ), 0)::text AS total
       FROM crm_invoices i
       LEFT JOIN crm_quotes q
         ON q.id = i.quote_id AND q.deleted_at IS NULL
       LEFT JOIN crm_opportunities o
         ON o.id = q.opportunity_id
         AND o.deleted_at IS NULL AND o.archived_at IS NULL
       WHERE i.deleted_at IS NULL AND i.archived_at IS NULL
         AND i.issue_date >= $1::date AND i.issue_date <= $2::date
         AND ${dashTenantFilter('i')}
       GROUP BY 1
       HAVING coalesce(sum(
                CASE
                  WHEN coalesce(i.document_kind::text, 'invoice') = 'credit_note'
                    AND i.status::text NOT IN ('Borrador', 'Anulada')
                    THEN -i.amount_cents
                  WHEN coalesce(i.document_kind::text, 'invoice') IN ('invoice', 'debit_note')
                    AND i.status::text IN ('Pendiente', 'Pagada', 'Vencida')
                    THEN i.amount_cents
                  ELSE 0
                END
              ), 0) <> 0
       ORDER BY 2 DESC
       LIMIT 6`,
      [rangeStartDate, rangeEndDate],
    ),
    tenantQuery<{ id: string; name: string; progress_pct: number | null }>(
      `SELECT id, name, progress_pct
       FROM crm_projects
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND updated_at >= $1 AND updated_at < $2
         AND ${dashTenantFilter()}
       ORDER BY updated_at DESC
       LIMIT 4`,
      [rangeStart, rangeEndExclusive],
    ),
    loadRevenueExpenseSeries(period, now),
  ])

  const oppCurrent = Number.parseInt(oppCounts.rows[0]?.current ?? '0', 10)
  const oppPrevious = Number.parseInt(oppCounts.rows[0]?.previous ?? '0', 10)
  const clientCurrent = Number.parseInt(clientCounts.rows[0]?.current ?? '0', 10)
  const clientPrevious = Number.parseInt(clientCounts.rows[0]?.previous ?? '0', 10)
  const pipelineCurrent = Number.parseInt(pipelineCounts.rows[0]?.current ?? '0', 10)
  const pipelinePrevious = Number.parseInt(pipelineCounts.rows[0]?.previous ?? '0', 10)
  const revCurrent = Number.parseInt(revenueCounts.rows[0]?.current ?? '0', 10)
  const revPrevious = Number.parseInt(revenueCounts.rows[0]?.previous ?? '0', 10)
  const expCurrent = Number.parseInt(expenseCounts.rows[0]?.current ?? '0', 10)
  const expPrevious = Number.parseInt(expenseCounts.rows[0]?.previous ?? '0', 10)

  const kpis: DashboardKpi[] = [
    {
      id: 'opportunities',
      title: 'Oportunidades',
      value: String(oppCurrent),
      changePercent: pctChange(oppCurrent, oppPrevious),
      subtitle: `Creadas · ${compareLabel}`,
      accent: 'blue',
    },
    {
      id: 'revenue',
      title: 'Ingresos',
      value: formatCompactMoney(revCurrent),
      changePercent: pctChange(revCurrent, revPrevious),
      subtitle: `Facturado emitido · ${compareLabel}`,
      accent: 'emerald',
    },
    {
      id: 'expenses',
      title: 'Gastos',
      value: formatCompactMoney(expCurrent),
      changePercent: pctChange(expCurrent, expPrevious),
      subtitle: `Compras + gastos · ${compareLabel}`,
      accent: 'rose',
    },
    {
      id: 'pipeline',
      title: 'Pipeline',
      value: formatCompactMoney(pipelineCurrent),
      changePercent: pctChange(pipelineCurrent, pipelinePrevious),
      subtitle: `Abiertas del periodo · ${compareLabel}`,
      accent: 'amber',
    },
    {
      id: 'newClients',
      title: 'Clientes nuevos',
      value: String(clientCurrent),
      changePercent: pctChange(clientCurrent, clientPrevious),
      subtitle: compareLabel,
      accent: 'violet',
    },
  ]

  const funnelMap = new Map<string, number>()
  for (const row of funnelRows.rows) {
    const bucket = mapToFunnelStage(row.stage)
    if (!bucket) continue
    funnelMap.set(bucket, (funnelMap.get(bucket) ?? 0) + Number.parseInt(row.count, 10))
  }
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
      status: displayOpportunityStage(row.stage),
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
    view: 'ventas',
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
