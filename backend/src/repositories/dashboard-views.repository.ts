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
  DashboardBarDatum,
  DashboardKpi,
  DashboardListItem,
  DashboardProductSalesItem,
  DashboardProjectProgress,
  DashboardRevenueSource,
  DashboardTimeSeriesLine,
  DashboardTimeSeriesPoint,
  DashboardViewId,
  DashboardViewSnapshot,
} from '../types/dashboard.js'
import { formatCentsToMoney } from '../utils/money.js'

function dashTenantFilter(tableAlias?: string): string {
  const col = tableAlias ? `${tableAlias}.tenant_id` : 'tenant_id'
  return `${col} = '${getTenantIdOrDefault()}'`
}

const CHART_COLORS = [
  'hsl(217 91% 55%)',
  'hsl(142 76% 45%)',
  'hsl(262 83% 58%)',
  'hsl(27 96% 61%)',
  'hsl(199 89% 48%)',
  'hsl(340 82% 52%)',
  'hsl(160 84% 39%)',
  'hsl(45 93% 47%)',
]

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function toDateParam(d: Date): string {
  // Prefer calendario Chile vía getPeriodRanges.*.Date; fallback seguro.
  const iso = d.toISOString().slice(0, 10)
  return iso
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
  if (previous <= 0) return 0
  return Math.round(((current - previous) / previous) * 100)
}

function mapBarRows(
  rows: { label: string; count: string }[],
): DashboardBarDatum[] {
  return rows.map((row, index) => ({
    label: row.label.trim() || '—',
    value: Number.parseInt(row.count, 10),
    color: CHART_COLORS[index % CHART_COLORS.length],
  }))
}

function mapDonutRows(
  rows: { label: string; count: string }[],
): DashboardRevenueSource[] {
  const total = rows.reduce((sum, row) => sum + Number.parseInt(row.count, 10), 0)
  return rows.map((row, index) => {
    const value = Number.parseInt(row.count, 10)
    const pct = total > 0 ? Math.round((value / total) * 1000) / 10 : 0
    return {
      name: row.label.trim() || '—',
      value,
      pct,
      color: CHART_COLORS[index % CHART_COLORS.length]!,
    }
  })
}

async function loadBitacoraHoursSeries(
  period: DashboardPeriod,
  _rangeStart: Date,
  _rangeEndExclusive: Date,
): Promise<{ series: DashboardTimeSeriesPoint[]; lines: DashboardTimeSeriesLine[] }> {
  if (period.mode === 'years') {
    const endYear = chilePartsFromDate(new Date()).year
    const startYear = endYear - 4
    const chartStart = `${startYear}-01-01`
    const chartEnd = `${endYear}-12-31`

    const result = await tenantQuery<{
      year: number
      billable: string
      non_billable: string
    }>(
      `SELECT extract(year from work_date)::int AS year,
              coalesce(sum(hours) filter (where is_billable = true), 0)::text AS billable,
              coalesce(sum(hours) filter (where is_billable = false), 0)::text AS non_billable
       FROM crm_bitacora_entries
       WHERE deleted_at IS NULL
         AND work_date >= $1::date AND work_date <= $2::date
         AND ${dashTenantFilter()}
       GROUP BY 1 ORDER BY 1`,
      [chartStart, chartEnd],
    )

    const billableMap = new Map<number, number>()
    const nonBillableMap = new Map<number, number>()
    for (const row of result.rows) {
      billableMap.set(row.year, Number.parseFloat(row.billable))
      nonBillableMap.set(row.year, Number.parseFloat(row.non_billable))
    }

    const series: DashboardTimeSeriesPoint[] = []
    for (let y = startYear; y <= endYear; y += 1) {
      series.push({
        label: String(y),
        facturables: Math.round((billableMap.get(y) ?? 0) * 10) / 10,
        noFacturables: Math.round((nonBillableMap.get(y) ?? 0) * 10) / 10,
      })
    }
    return {
      series,
      lines: [
        { key: 'facturables', label: 'Facturables', color: 'hsl(217 91% 55%)' },
        { key: 'noFacturables', label: 'No facturables', color: 'hsl(27 96% 61%)' },
      ],
    }
  }

  if (period.mode === 'year') {
    const chartStart = toDateParam(new Date(period.year, 0, 1))
    const chartEnd = toDateParam(new Date(period.year, 11, 31))

    const result = await tenantQuery<{
      month: Date
      billable: string
      non_billable: string
    }>(
      `SELECT date_trunc('month', work_date)::date AS month,
              coalesce(sum(hours) filter (where is_billable = true), 0)::text AS billable,
              coalesce(sum(hours) filter (where is_billable = false), 0)::text AS non_billable
       FROM crm_bitacora_entries
       WHERE deleted_at IS NULL
         AND work_date >= $1::date AND work_date <= $2::date
         AND ${dashTenantFilter()}
       GROUP BY 1 ORDER BY 1`,
      [chartStart, chartEnd],
    )

    const billableMap = new Map<number, number>()
    const nonBillableMap = new Map<number, number>()
    for (const row of result.rows) {
      const idx = new Date(row.month).getMonth()
      billableMap.set(idx, Number.parseFloat(row.billable))
      nonBillableMap.set(idx, Number.parseFloat(row.non_billable))
    }

    return {
      series: MONTH_LABELS.map((label, idx) => ({
        label,
        facturables: Math.round((billableMap.get(idx) ?? 0) * 10) / 10,
        noFacturables: Math.round((nonBillableMap.get(idx) ?? 0) * 10) / 10,
      })),
      lines: [
        { key: 'facturables', label: 'Facturables', color: 'hsl(217 91% 55%)' },
        { key: 'noFacturables', label: 'No facturables', color: 'hsl(27 96% 61%)' },
      ],
    }
  }

  const anchor = new Date(period.year, period.month, 1)
  const windowStart = new Date(anchor.getFullYear(), anchor.getMonth() - 5, 1)
  const windowEnd = new Date(period.year, period.month + 1, 0)

  const result = await tenantQuery<{
    month: Date
    billable: string
    non_billable: string
  }>(
    `SELECT date_trunc('month', work_date)::date AS month,
            coalesce(sum(hours) filter (where is_billable = true), 0)::text AS billable,
            coalesce(sum(hours) filter (where is_billable = false), 0)::text AS non_billable
     FROM crm_bitacora_entries
     WHERE deleted_at IS NULL
       AND work_date >= $1::date AND work_date <= $2::date
       AND ${dashTenantFilter()}
     GROUP BY 1 ORDER BY 1`,
    [toDateParam(windowStart), toDateParam(windowEnd)],
  )

  const billableMap = new Map<string, number>()
  const nonBillableMap = new Map<string, number>()
  for (const row of result.rows) {
    const d = new Date(row.month)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    billableMap.set(key, Number.parseFloat(row.billable))
    nonBillableMap.set(key, Number.parseFloat(row.non_billable))
  }

  const series: DashboardTimeSeriesPoint[] = []
  for (let i = 0; i < 6; i += 1) {
    const d = new Date(windowStart.getFullYear(), windowStart.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    series.push({
      label: MONTH_LABELS[d.getMonth()] ?? '—',
      facturables: Math.round((billableMap.get(key) ?? 0) * 10) / 10,
      noFacturables: Math.round((nonBillableMap.get(key) ?? 0) * 10) / 10,
    })
  }

  return {
    series,
    lines: [
      { key: 'facturables', label: 'Facturables', color: 'hsl(217 91% 55%)' },
      { key: 'noFacturables', label: 'No facturables', color: 'hsl(27 96% 61%)' },
    ],
  }
}

async function loadPurchaseExpenseSeries(
  period: DashboardPeriod,
  now: Date,
): Promise<{ series: DashboardTimeSeriesPoint[]; lines: DashboardTimeSeriesLine[] }> {
  if (period.mode === 'years') {
    const endYear = now.getFullYear()
    const startYear = endYear - 4
    const chartStart = toDateParam(new Date(startYear, 0, 1))
    const chartEnd = toDateParam(new Date(endYear, 11, 31))

    const result = await tenantQuery<{ year: number; total: string }>(
      `SELECT extract(year from order_date)::int AS year,
              coalesce(sum(amount_cents), 0)::text AS total
       FROM crm_purchases
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND order_date >= $1::date AND order_date <= $2::date
         AND ${dashTenantFilter()}
       GROUP BY 1 ORDER BY 1`,
      [chartStart, chartEnd],
    )

    const map = new Map(result.rows.map((r) => [r.year, Number.parseInt(r.total, 10) / 100]))
    const series: DashboardTimeSeriesPoint[] = []
    for (let y = startYear; y <= endYear; y += 1) {
      series.push({ label: String(y), compras: map.get(y) ?? 0 })
    }
    return {
      series,
      lines: [{ key: 'compras', label: 'Compras', color: 'hsl(142 76% 45%)' }],
    }
  }

  if (period.mode === 'year') {
    const chartStart = toDateParam(new Date(period.year, 0, 1))
    const chartEnd = toDateParam(new Date(period.year, 11, 31))

    const result = await tenantQuery<{ month: Date; total: string }>(
      `SELECT date_trunc('month', order_date)::date AS month,
              coalesce(sum(amount_cents), 0)::text AS total
       FROM crm_purchases
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND order_date >= $1::date AND order_date <= $2::date
         AND ${dashTenantFilter()}
       GROUP BY 1 ORDER BY 1`,
      [chartStart, chartEnd],
    )

    const map = new Map(
      result.rows.map((r) => [new Date(r.month).getMonth(), Number.parseInt(r.total, 10) / 100]),
    )
    return {
      series: MONTH_LABELS.map((label, idx) => ({
        label,
        compras: map.get(idx) ?? 0,
      })),
      lines: [{ key: 'compras', label: 'Compras', color: 'hsl(142 76% 45%)' }],
    }
  }

  const anchor = new Date(period.year, period.month, 1)
  const windowStart = new Date(anchor.getFullYear(), anchor.getMonth() - 5, 1)
  const windowEnd = new Date(period.year, period.month + 1, 0)

  const result = await tenantQuery<{ month: Date; total: string }>(
    `SELECT date_trunc('month', order_date)::date AS month,
            coalesce(sum(amount_cents), 0)::text AS total
     FROM crm_purchases
     WHERE deleted_at IS NULL AND archived_at IS NULL
       AND order_date >= $1::date AND order_date <= $2::date
       AND ${dashTenantFilter()}
     GROUP BY 1 ORDER BY 1`,
    [toDateParam(windowStart), toDateParam(windowEnd)],
  )

  const map = new Map<string, number>(
    result.rows.map((r) => {
      const d = new Date(r.month)
      return [`${d.getFullYear()}-${d.getMonth()}`, Number.parseInt(r.total, 10) / 100]
    }),
  )

  const series: DashboardTimeSeriesPoint[] = []
  for (let i = 0; i < 6; i += 1) {
    const d = new Date(windowStart.getFullYear(), windowStart.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    series.push({
      label: MONTH_LABELS[d.getMonth()] ?? '—',
      compras: map.get(key) ?? 0,
    })
  }

  return {
    series,
    lines: [{ key: 'compras', label: 'Compras', color: 'hsl(142 76% 45%)' }],
  }
}

const PRODUCT_SALES_IN_PERIOD_SQL = `
  WITH issued_lines AS (
    SELECT
      li.product_id,
      trim(lower(li.sku)) AS sku_key,
      trim(li.sku) AS sku,
      trim(li.product_name) AS product_name,
      li.quantity
    FROM crm_invoice_line_items li
    INNER JOIN crm_invoices inv ON inv.id = li.invoice_id
    WHERE inv.deleted_at IS NULL
      AND inv.archived_at IS NULL
      AND inv.status NOT IN ('Borrador', 'Anulada')
      AND inv.issue_date >= $1::date
      AND inv.issue_date <= $2::date
      AND ${dashTenantFilter('inv')}
  ),
  by_product AS (
    SELECT
      product_id::text AS row_id,
      NULL::text AS sku,
      max(product_name) AS product_name,
      COALESCE(SUM(quantity), 0) AS total_quantity
    FROM issued_lines
    WHERE product_id IS NOT NULL
    GROUP BY product_id
  ),
  by_sku AS (
    SELECT
      sku_key AS row_id,
      max(sku) AS sku,
      max(product_name) AS product_name,
      COALESCE(SUM(quantity), 0) AS total_quantity
    FROM issued_lines
    WHERE product_id IS NULL AND sku_key <> ''
    GROUP BY sku_key
  )
  SELECT row_id, sku, product_name, total_quantity::text
  FROM (
    SELECT * FROM by_product
    UNION ALL
    SELECT * FROM by_sku
  ) combined
  WHERE total_quantity > 0
`

function mapProductSalesRows(
  rows: { row_id: string; sku: string | null; product_name: string | null; total_quantity: string }[],
): DashboardProductSalesItem[] {
  return rows.map((row) => ({
    id: row.row_id,
    name: row.product_name?.trim() || row.sku?.trim() || '—',
    sku: row.sku?.trim() || undefined,
    quantity: Math.round(Number.parseFloat(row.total_quantity) * 1000) / 1000,
  }))
}

async function loadProductSalesInPeriod(
  rangeStartIso: string,
  rangeEndIso: string,
): Promise<DashboardProductSalesItem[]> {
  const result = await tenantQuery<{
    row_id: string
    sku: string | null
    product_name: string | null
    total_quantity: string
  }>(
    `${PRODUCT_SALES_IN_PERIOD_SQL}
     ORDER BY total_quantity DESC, product_name ASC`,
    [rangeStartIso, rangeEndIso],
  )
  return mapProductSalesRows(result.rows)
}

function splitTopBottomProductSales(
  items: DashboardProductSalesItem[],
  limit = 5,
): { top: DashboardProductSalesItem[]; bottom: DashboardProductSalesItem[] } {
  const top = items.slice(0, limit)
  const topIds = new Set(top.map((item) => item.id))
  const bottom = [...items]
    .reverse()
    .filter((item) => !topIds.has(item.id))
    .slice(0, limit)
  return { top, bottom }
}

export async function getOperacionesDashboardSnapshot(
  period: DashboardPeriod = defaultDashboardPeriod(),
): Promise<DashboardViewSnapshot> {
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
  const rangeStartIso = rangeStartDate
  const rangeEndIso = rangeEndDate
  const prevStartIso = prevRangeStartDate
  const prevEndIso = prevRangeEndDate

  const [
    solicitudCounts,
    projectCounts,
    hoursCounts,
    activityCounts,
    solicitudStatusRows,
    projectHealthRows,
    attentionRows,
    projectProgressRows,
    hoursSeries,
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
       FROM crm_solicitudes
       WHERE ${dashTenantFilter()}`,
      [rangeStart, rangeEndExclusive, prevRangeStart, prevRangeEndExclusive],
    ),
    tenantQuery<{ current: string; previous: string }>(
      `SELECT
        count(*) FILTER (
          WHERE deleted_at IS NULL AND archived_at IS NULL
            AND lower(trim(status::text)) NOT IN ('cerrado', 'archivado', 'completado')
            AND updated_at >= $1 AND updated_at <= $2
        )::text AS current,
        count(*) FILTER (
          WHERE deleted_at IS NULL AND archived_at IS NULL
            AND lower(trim(status::text)) NOT IN ('cerrado', 'archivado', 'completado')
            AND updated_at >= $3 AND updated_at <= $4
        )::text AS previous
       FROM crm_projects
       WHERE ${dashTenantFilter()}`,
      [rangeStart, rangeEndExclusive, prevRangeStart, prevRangeEndExclusive],
    ),
    tenantQuery<{ current: string; previous: string }>(
      `SELECT
        coalesce(sum(hours) FILTER (
          WHERE deleted_at IS NULL
            AND work_date >= $1::date AND work_date <= $2::date
        ), 0)::text AS current,
        coalesce(sum(hours) FILTER (
          WHERE deleted_at IS NULL
            AND work_date >= $3::date AND work_date <= $4::date
        ), 0)::text AS previous
       FROM crm_bitacora_entries
       WHERE ${dashTenantFilter()}`,
      [rangeStartIso, rangeEndIso, prevStartIso, prevEndIso],
    ),
    tenantQuery<{ current: string; previous: string }>(
      `SELECT
        count(*) FILTER (
          WHERE deleted_at IS NULL
            AND status IN ('Pendiente', 'En curso')
            AND created_at >= $1 AND created_at < $2
        )::text AS current,
        count(*) FILTER (
          WHERE deleted_at IS NULL
            AND status IN ('Pendiente', 'En curso')
            AND created_at >= $3 AND created_at < $4
        )::text AS previous
       FROM crm_activities
       WHERE ${dashTenantFilter()}`,
      [rangeStart, rangeEndExclusive, prevRangeStart, prevRangeEndExclusive],
    ),
    tenantQuery<{ label: string; count: string }>(
      `SELECT trim(status::text) AS label, count(*)::text AS count
       FROM crm_solicitudes
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND created_at >= $1 AND created_at < $2
         AND ${dashTenantFilter()}
       GROUP BY trim(status::text)
       ORDER BY count(*) DESC`,
      [rangeStart, rangeEndExclusive],
    ),
    tenantQuery<{ label: string; count: string }>(
      `SELECT coalesce(nullif(trim(health), ''), 'Sin clasificar') AS label,
              count(*)::text AS count
       FROM crm_projects
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND lower(trim(status::text)) NOT IN ('cerrado', 'archivado', 'completado')
         AND updated_at >= $1 AND updated_at <= $2
         AND ${dashTenantFilter()}
       GROUP BY 1
       ORDER BY count(*) DESC`,
      [rangeStart, rangeEndExclusive],
    ),
    tenantQuery<{
      id: string
      code: string
      title: string
      status: string
      company_name: string | null
      assignee_name: string
    }>(
      `SELECT id, code, title, trim(status::text) AS status, company_name, assignee_name
       FROM crm_solicitudes
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND trim(status::text) IN (
           'Detenido por cliente',
           'Detenido Internamente',
           'En espera de Cliente',
           'En Proceso'
         )
         AND updated_at >= $1 AND updated_at <= $2
         AND ${dashTenantFilter()}
       ORDER BY updated_at DESC
       LIMIT 5`,
      [rangeStart, rangeEndExclusive],
    ),
    tenantQuery<{ id: string; name: string; progress_pct: number | null }>(
      `SELECT id, name, progress_pct
       FROM crm_projects
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND lower(trim(status::text)) NOT IN ('cerrado', 'archivado', 'completado')
         AND updated_at >= $1 AND updated_at <= $2
         AND ${dashTenantFilter()}
       ORDER BY progress_pct ASC NULLS FIRST, updated_at DESC
       LIMIT 5`,
      [rangeStart, rangeEndExclusive],
    ),
    loadBitacoraHoursSeries(period, rangeStart, rangeEndExclusive),
  ])

  const solCurrent = Number.parseInt(solicitudCounts.rows[0]?.current ?? '0', 10)
  const solPrevious = Number.parseInt(solicitudCounts.rows[0]?.previous ?? '0', 10)
  const projCurrent = Number.parseInt(projectCounts.rows[0]?.current ?? '0', 10)
  const projPrevious = Number.parseInt(projectCounts.rows[0]?.previous ?? '0', 10)
  const hoursCurrent = Math.round(Number.parseFloat(hoursCounts.rows[0]?.current ?? '0') * 10) / 10
  const hoursPrevious = Math.round(Number.parseFloat(hoursCounts.rows[0]?.previous ?? '0') * 10) / 10
  const actCurrent = Number.parseInt(activityCounts.rows[0]?.current ?? '0', 10)
  const actPrevious = Number.parseInt(activityCounts.rows[0]?.previous ?? '0', 10)

  const kpis: DashboardKpi[] = [
    {
      id: 'solicitudes',
      title: 'Solicitudes nuevas',
      value: String(solCurrent),
      changePercent: pctChange(solCurrent, solPrevious),
      subtitle: compareLabel,
      accent: 'blue',
    },
    {
      id: 'projects',
      title: 'Proyectos activos',
      value: String(projCurrent),
      changePercent: pctChange(projCurrent, projPrevious),
      subtitle: compareLabel,
      accent: 'violet',
    },
    {
      id: 'hours',
      title: 'Horas registradas',
      value: `${hoursCurrent} h`,
      changePercent: pctChange(hoursCurrent, hoursPrevious),
      subtitle: compareLabel,
      accent: 'emerald',
    },
    {
      id: 'activities',
      title: 'Actividades abiertas',
      value: String(actCurrent),
      changePercent: pctChange(actCurrent, actPrevious),
      subtitle: compareLabel,
      accent: 'amber',
    },
  ]

  const progressItems: DashboardProjectProgress[] = projectProgressRows.rows.map((row) => ({
    id: row.id,
    name: row.name,
    pct: Math.min(100, Math.max(0, Math.round(row.progress_pct ?? 0))),
  }))

  const listItems: DashboardListItem[] = attentionRows.rows.map((row) => ({
    id: row.id,
    title: `${row.code} · ${row.title}`,
    subtitle: row.company_name?.trim() || '—',
    meta: row.assignee_name?.trim() || '—',
    badge: row.status,
    href: `/solicitudes/${row.id}`,
  }))

  return {
    view: 'operaciones',
    dateRangeLabel: buildDashboardDateRangeLabel(period),
    chartDescription: chartDescriptionForPeriod(period),
    kpis,
    barChart: {
      title: 'Solicitudes por estado',
      description: 'Distribución en el periodo seleccionado',
      items: mapBarRows(solicitudStatusRows.rows),
    },
    donutChart: {
      title: 'Salud de proyectos',
      description: 'Proyectos con actividad en el periodo seleccionado',
      slices: mapDonutRows(projectHealthRows.rows),
      centerLabel: 'Proyectos',
    },
    timeSeries: {
      title: 'Horas en bitácora',
      description: chartDescriptionForPeriod(period),
      series: hoursSeries.series,
      lines: hoursSeries.lines,
    },
    listSection: {
      title: 'Solicitudes que requieren atención',
      description: 'Con movimiento en el periodo seleccionado',
      items: listItems,
    },
    progressSection: {
      title: 'Proyectos con menor avance',
      description: 'Entre los proyectos activos del periodo',
      items: progressItems,
    },
  }
}

export async function getAbastecimientoDashboardSnapshot(
  period: DashboardPeriod = defaultDashboardPeriod(),
): Promise<DashboardViewSnapshot> {
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
  const rangeStartIso = rangeStartDate
  const rangeEndIso = rangeEndDate
  const prevStartIso = prevRangeStartDate
  const prevEndIso = prevRangeEndDate

  const [
    purchaseAmounts,
    purchaseCounts,
    lowStockCounts,
    receiptCounts,
    purchaseStatusRows,
    inventoryStatusRows,
    criticalStockRows,
    recentPurchaseRows,
    purchaseSeries,
    productSalesRows,
  ] = await Promise.all([
    tenantQuery<{ current: string; previous: string }>(
      `SELECT
        coalesce(sum(amount_cents) FILTER (
          WHERE deleted_at IS NULL AND archived_at IS NULL
            AND order_date >= $1::date AND order_date <= $2::date
        ), 0)::text AS current,
        coalesce(sum(amount_cents) FILTER (
          WHERE deleted_at IS NULL AND archived_at IS NULL
            AND order_date >= $3::date AND order_date <= $4::date
        ), 0)::text AS previous
       FROM crm_purchases
       WHERE ${dashTenantFilter()}`,
      [rangeStartIso, rangeEndIso, prevStartIso, prevEndIso],
    ),
    tenantQuery<{ current: string; previous: string }>(
      `SELECT
        count(*) FILTER (
          WHERE deleted_at IS NULL AND archived_at IS NULL
            AND status IN ('Emitida', 'Confirmada')
            AND order_date >= $1::date AND order_date <= $2::date
        )::text AS current,
        count(*) FILTER (
          WHERE deleted_at IS NULL AND archived_at IS NULL
            AND status IN ('Emitida', 'Confirmada')
            AND order_date >= $3::date AND order_date <= $4::date
        )::text AS previous
       FROM crm_purchases
       WHERE ${dashTenantFilter()}`,
      [rangeStartIso, rangeEndIso, prevStartIso, prevEndIso],
    ),
    tenantQuery<{ current: string; previous: string }>(
      `SELECT
        count(*) FILTER (
          WHERE status IN ('Stock bajo', 'Sin stock', 'Quiebre de stock')
        )::text AS current,
        count(*) FILTER (
          WHERE status IN ('Stock bajo', 'Sin stock', 'Quiebre de stock')
        )::text AS previous
       FROM crm_inventory_positions
       WHERE ${dashTenantFilter()}`,
    ),
    tenantQuery<{ current: string; previous: string }>(
      `SELECT
        count(*) FILTER (
          WHERE deleted_at IS NULL
            AND status = 'Confirmado'
            AND confirmed_at >= $1 AND confirmed_at <= $2
        )::text AS current,
        count(*) FILTER (
          WHERE deleted_at IS NULL
            AND status = 'Confirmado'
            AND confirmed_at >= $3 AND confirmed_at <= $4
        )::text AS previous
       FROM crm_stock_receipts
       WHERE ${dashTenantFilter()}`,
      [rangeStart, rangeEndExclusive, prevRangeStart, prevRangeEndExclusive],
    ),
    tenantQuery<{ label: string; count: string }>(
      `SELECT trim(status::text) AS label, count(*)::text AS count
       FROM crm_purchases
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND order_date >= $1::date AND order_date <= $2::date
         AND ${dashTenantFilter()}
       GROUP BY trim(status::text)
       ORDER BY count(*) DESC`,
      [rangeStartIso, rangeEndIso],
    ),
    tenantQuery<{ label: string; count: string }>(
      `SELECT coalesce(nullif(trim(status::text), ''), 'Sin clasificar') AS label,
              count(*)::text AS count
       FROM crm_inventory_positions
       WHERE ${dashTenantFilter()}
       GROUP BY 1
       ORDER BY count(*) DESC`,
    ),
    tenantQuery<{
      id: string
      product_name: string
      sku: string
      warehouse_name: string | null
      quantity_on_hand: string
      min_stock: string
      status: string
    }>(
      `SELECT id, product_name, sku, warehouse_name,
              quantity_on_hand::text, min_stock::text, status
       FROM crm_inventory_positions
       WHERE status IN ('Stock bajo', 'Sin stock', 'Quiebre de stock')
         AND ${dashTenantFilter()}
       ORDER BY quantity_on_hand ASC, min_stock DESC
       LIMIT 5`,
    ),
    tenantQuery<{
      id: string
      reference: string
      supplier_name: string | null
      status: string
      amount_cents: string
    }>(
      `SELECT id, reference, supplier_name, trim(status::text) AS status, amount_cents::text
       FROM crm_purchases
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND order_date >= $1::date AND order_date <= $2::date
         AND ${dashTenantFilter()}
       ORDER BY order_date DESC
       LIMIT 5`,
      [rangeStartIso, rangeEndIso],
    ),
    loadPurchaseExpenseSeries(period, now),
    loadProductSalesInPeriod(rangeStartIso, rangeEndIso),
  ])

  const amountCurrent = Number.parseInt(purchaseAmounts.rows[0]?.current ?? '0', 10)
  const amountPrevious = Number.parseInt(purchaseAmounts.rows[0]?.previous ?? '0', 10)
  const purchaseCurrent = Number.parseInt(purchaseCounts.rows[0]?.current ?? '0', 10)
  const purchasePrevious = Number.parseInt(purchaseCounts.rows[0]?.previous ?? '0', 10)
  const lowStockCurrent = Number.parseInt(lowStockCounts.rows[0]?.current ?? '0', 10)
  const receiptCurrent = Number.parseInt(receiptCounts.rows[0]?.current ?? '0', 10)
  const receiptPrevious = Number.parseInt(receiptCounts.rows[0]?.previous ?? '0', 10)

  const kpis: DashboardKpi[] = [
    {
      id: 'purchasesAmount',
      title: 'Monto en compras',
      value: formatCompactMoney(amountCurrent),
      changePercent: pctChange(amountCurrent, amountPrevious),
      subtitle: compareLabel,
      accent: 'emerald',
    },
    {
      id: 'purchasesCount',
      title: 'Órdenes emitidas',
      value: String(purchaseCurrent),
      changePercent: pctChange(purchaseCurrent, purchasePrevious),
      subtitle: compareLabel,
      accent: 'blue',
    },
    {
      id: 'lowStock',
      title: 'Posiciones críticas',
      value: String(lowStockCurrent),
      changePercent: 0,
      subtitle: 'Stock bajo o sin stock',
      accent: 'amber',
    },
    {
      id: 'receipts',
      title: 'Ingresos confirmados',
      value: String(receiptCurrent),
      changePercent: pctChange(receiptCurrent, receiptPrevious),
      subtitle: compareLabel,
      accent: 'violet',
    },
  ]

  const listItems: DashboardListItem[] = [
    ...criticalStockRows.rows.map((row) => ({
      id: row.id,
      title: row.product_name,
      subtitle: `${row.sku}${row.warehouse_name ? ` · ${row.warehouse_name}` : ''}`,
      meta: `Disp: ${row.quantity_on_hand} / Mín: ${row.min_stock}`,
      badge: row.status,
      href: '/inventario',
    })),
    ...recentPurchaseRows.rows.map((row) => ({
      id: row.id,
      title: row.reference,
      subtitle: row.supplier_name?.trim() || '—',
      meta: formatCentsToMoney(Number.parseInt(row.amount_cents, 10)),
      badge: row.status,
      href: `/compras/${row.id}`,
    })),
  ].slice(0, 6)

  const { top: topProducts, bottom: bottomProducts } = splitTopBottomProductSales(productSalesRows)

  return {
    view: 'abastecimiento',
    dateRangeLabel: buildDashboardDateRangeLabel(period),
    chartDescription: chartDescriptionForPeriod(period),
    kpis,
    barChart: {
      title: 'Compras por estado',
      description: 'Órdenes del periodo seleccionado',
      items: mapBarRows(purchaseStatusRows.rows),
    },
    donutChart: {
      title: 'Inventario por estado',
      description: 'Posiciones de stock actuales',
      slices: mapDonutRows(inventoryStatusRows.rows),
      centerLabel: 'Posiciones',
    },
    timeSeries: {
      title: 'Evolución de compras',
      description: chartDescriptionForPeriod(period),
      series: purchaseSeries.series,
      lines: purchaseSeries.lines,
    },
    listSection: {
      title: 'Alertas y compras recientes',
      description: 'Stock crítico y últimas órdenes',
      items: listItems,
    },
    topProducts: {
      title: 'Productos más vendidos',
      description: 'Unidades en facturas emitidas del periodo',
      items: topProducts,
    },
    bottomProducts: {
      title: 'Productos menos vendidos',
      description: 'Con ventas registradas en el periodo (excluye los del top)',
      items: bottomProducts,
    },
  }
}

export type { DashboardViewId }
