import { labelForPeriod, type DashboardPeriod } from '@/lib/dashboard-period'
import type { DashboardData, DashboardViewId } from '@/types/dashboard'

function chartDescriptionForPeriod(period: DashboardPeriod): string {
  if (period.mode === 'years') return 'Comparación anual'
  if (period.mode === 'year') return 'Desglose mensual del año'
  return 'Desglose diario del mes'
}

function emptyTimeSeries(period: DashboardPeriod) {
  if (period.mode === 'years') {
    const endYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => ({
      label: String(endYear - 4 + i),
      value: 0,
    }))
  }
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  if (period.mode === 'year') {
    return months.map((label) => ({ label, value: 0 }))
  }
  const daysInMonth = new Date(period.year, period.month + 1, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => ({
    label: String(i + 1),
    value: 0,
  }))
}

function zeroKpis(
  items: { id: string; title: string; value: string; accent: DashboardData['kpis'][0]['accent']; subtitle?: string }[],
): DashboardData['kpis'] {
  return items.map((item) => ({
    ...item,
    changePercent: 0,
    subtitle: item.subtitle ?? 'Sin datos en el periodo',
  }))
}

/** Datos vacíos (ceros) cuando la API falla — nunca datos de demostración en producción. */
export function getEmptyDashboard(period: DashboardPeriod, view: DashboardViewId): DashboardData {
  const base = {
    dateRangeLabel: labelForPeriod(period),
    chartDescription: chartDescriptionForPeriod(period),
  }

  if (view === 'operaciones') {
    const series = emptyTimeSeries(period).map((point) => ({
      label: point.label,
      facturables: 0,
      noFacturables: 0,
    }))
    return {
      view: 'operaciones',
      ...base,
      kpis: zeroKpis([
        { id: 'solicitudes', title: 'Solicitudes nuevas', value: '0', accent: 'blue' },
        { id: 'projects', title: 'Proyectos activos', value: '0', accent: 'violet' },
        { id: 'hours', title: 'Horas registradas', value: '0 h', accent: 'emerald' },
        { id: 'activities', title: 'Actividades abiertas', value: '0', accent: 'amber' },
      ]),
      barChart: {
        title: 'Solicitudes por estado',
        description: 'Sin solicitudes en el periodo',
        items: [],
      },
      donutChart: {
        title: 'Salud de proyectos',
        description: 'Sin proyectos registrados',
        centerLabel: 'Proyectos',
        slices: [],
      },
      timeSeries: {
        title: 'Horas en bitácora',
        description: base.chartDescription,
        series,
        lines: [
          { key: 'facturables', label: 'Facturables', color: 'hsl(217 91% 55%)' },
          { key: 'noFacturables', label: 'No facturables', color: 'hsl(27 96% 61%)' },
        ],
      },
      listSection: {
        title: 'Solicitudes que requieren atención',
        description: 'Sin registros pendientes',
        items: [],
      },
      progressSection: {
        title: 'Proyectos con menor avance',
        description: 'Sin proyectos activos',
        items: [],
      },
    }
  }

  if (view === 'abastecimiento') {
    const series = emptyTimeSeries(period).map((point) => ({
      label: point.label,
      compras: 0,
    }))
    return {
      view: 'abastecimiento',
      ...base,
      kpis: zeroKpis([
        { id: 'purchasesAmount', title: 'Monto en compras', value: '$0', accent: 'emerald' },
        { id: 'purchasesCount', title: 'Órdenes emitidas', value: '0', accent: 'blue' },
        {
          id: 'lowStock',
          title: 'Posiciones críticas',
          value: '0',
          accent: 'amber',
          subtitle: 'Stock bajo o sin stock',
        },
        { id: 'receipts', title: 'Ingresos confirmados', value: '0', accent: 'violet' },
      ]),
      barChart: {
        title: 'Compras por estado',
        description: 'Sin compras en el periodo',
        items: [],
      },
      donutChart: {
        title: 'Inventario por estado',
        description: 'Sin posiciones de inventario',
        centerLabel: 'Posiciones',
        slices: [],
      },
      timeSeries: {
        title: 'Evolución de compras',
        description: base.chartDescription,
        series,
        lines: [{ key: 'compras', label: 'Compras', color: 'hsl(142 76% 45%)' }],
      },
      listSection: {
        title: 'Alertas y compras recientes',
        description: 'Sin alertas ni compras recientes',
        items: [],
      },
      topProducts: {
        title: 'Productos más vendidos',
        description: 'Unidades facturadas en el periodo',
        items: [],
      },
      bottomProducts: {
        title: 'Productos menos vendidos',
        description: 'Con ventas registradas en el periodo',
        items: [],
      },
    }
  }

  const series = emptyTimeSeries(period).map((point) => ({
    label: point.label,
    ingresos: 0,
    gastos: 0,
  }))

  return {
    view: 'ventas',
    ...base,
    kpis: zeroKpis([
      { id: 'opportunities', title: 'Oportunidades', value: '0', accent: 'blue' },
      { id: 'revenue', title: 'Ingresos', value: '$0', accent: 'emerald' },
      { id: 'expenses', title: 'Gastos', value: '$0', accent: 'rose' },
      { id: 'pipeline', title: 'Pipeline', value: '$0', accent: 'amber' },
      { id: 'newClients', title: 'Clientes nuevos', value: '0', accent: 'violet' },
    ]),
    funnelStages: [],
    revenueExpenseSeries: series.map(({ label, ingresos, gastos }) => ({
      month: label,
      ingresos,
      gastos,
    })),
    pendingActivities: [],
    recentOpportunities: [],
    revenueBySource: [],
    tasksByProject: [],
  }
}
