/** Datos de demostración para el Dashboard (fallback sin API). */

import {
  labelForPeriod,
  type DashboardPeriod,
} from '@/lib/dashboard-period'
import type {
  DashboardData,
  FunnelStage,
  KpiAccent,
  KpiDatum,
  PendingActivityItem,
  ProjectTaskDatum,
  RecentOpportunity,
  RevenueExpensePoint,
  RevenueSourceDatum,
} from '@/types/dashboard'

export type {
  DashboardData,
  FunnelStage,
  KpiAccent,
  KpiDatum,
  PendingActivityItem,
  ProjectTaskDatum,
  RecentOpportunity,
  RevenueExpensePoint,
  RevenueSourceDatum,
}

export const dashboardKpis: KpiDatum[] = [
  {
    id: 'opportunities',
    title: 'Oportunidades',
    value: '128',
    changePercent: 18,
    subtitle: 'vs. mes anterior',
    accent: 'blue',
  },
  {
    id: 'revenue',
    title: 'Ingresos',
    value: '$245k',
    changePercent: 22,
    subtitle: 'vs. mes anterior',
    accent: 'emerald',
  },
  {
    id: 'newClients',
    title: 'Clientes',
    value: '32',
    changePercent: 10,
    subtitle: 'vs. mes anterior',
    accent: 'violet',
  },
  {
    id: 'activities',
    title: 'Actividades',
    value: '264',
    changePercent: -8,
    subtitle: 'vs. mes anterior',
    accent: 'amber',
  },
]

export const funnelStages: FunnelStage[] = [
  { label: 'Prospectos', value: 1200 },
  { label: 'Calificados', value: 800 },
  { label: 'Propuesta', value: 450 },
  { label: 'Negociación', value: 200 },
  { label: 'Cerrados', value: 85 },
]

export const revenueExpenseSeries: RevenueExpensePoint[] = [
  { month: 'Ene', ingresos: 180_000, gastos: 120_000 },
  { month: 'Feb', ingresos: 195_000, gastos: 125_000 },
  { month: 'Mar', ingresos: 210_000, gastos: 130_000 },
  { month: 'Abr', ingresos: 228_000, gastos: 132_000 },
  { month: 'May', ingresos: 238_000, gastos: 135_000 },
  { month: 'Jun', ingresos: 245_000, gastos: 138_000 },
]

export const pendingActivities: PendingActivityItem[] = [
  {
    id: 'a1',
    title: 'Llamar a Juan Pérez',
    company: 'Tech Solutions',
    timeLabel: 'Hoy • 14:30',
    icon: 'call',
  },
  {
    id: 'a2',
    title: 'Enviar propuesta v2',
    company: 'Industrial Plus',
    timeLabel: 'Hoy • 17:00',
    icon: 'mail',
  },
  {
    id: 'a3',
    title: 'Demo producto',
    company: 'Nova Retail',
    timeLabel: 'Mañana • 10:15',
    icon: 'meeting',
  },
  {
    id: 'a4',
    title: 'Seguimiento contrato',
    company: 'BlueWave',
    timeLabel: '12 may • 09:00',
    icon: 'call',
  },
]

export const recentOpportunities: RecentOpportunity[] = [
  {
    id: 'o1',
    name: 'Expansión cloud',
    company: 'Tech Solutions',
    status: 'Propuesta',
    amountLabel: '$55,400',
  },
  {
    id: 'o2',
    name: 'Renovación anual ERP',
    company: 'Industrial Plus',
    status: 'Negociación',
    amountLabel: '$128,900',
  },
  {
    id: 'o3',
    name: 'Onboarding equipo ventas',
    company: 'Nova Retail',
    status: 'Calificados',
    amountLabel: '$18,200',
  },
  {
    id: 'o4',
    name: 'Integración Shopify',
    company: 'BlueWave',
    status: 'Propuesta',
    amountLabel: '$32,650',
  },
]

export const revenueBySource: RevenueSourceDatum[] = [
  { name: 'Referidos', value: 98450, pct: 40.2, color: 'hsl(217 91% 55%)' },
  {
    name: 'Búsqueda orgánica',
    value: 71260,
    pct: 29.1,
    color: 'hsl(142 76% 45%)',
  },
  {
    name: 'Redes sociales',
    value: 49825,
    pct: 20.3,
    color: 'hsl(262 83% 58%)',
  },
  { name: 'Campañas', value: 25465, pct: 10.4, color: 'hsl(27 96% 61%)' },
]

export const tasksByProject: ProjectTaskDatum[] = [
  { id: 'pr1', name: 'Implementación SaaS Core', pct: 75 },
  { id: 'pr2', name: 'Migración datos ERP', pct: 60 },
  { id: 'pr3', name: 'Capacitación ventas LATAM', pct: 30 },
  { id: 'pr4', name: 'Integración Shopify + POS', pct: 90 },
]

export const featuredContact = {
  firstName: 'Juan',
  lastName: 'Pérez',
  titleLabel: 'CTO en Tech Solutions',
  avatarUrl:
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=240&h=240&fit=crop',
  badge: 'Cliente' as const,
  email: 'juan.perez@techsolutions.com',
  phone: '+54 11 5843-9210',
  company: 'Tech Solutions',
  role: 'Chief Technology Officer',
  location: 'Buenos Aires, Argentina',
  leadSource: 'Referido estratégico',
}

export type InteractionEvent = {
  id: string
  title: string
  detail: string
  dateLabel: string
  owner: string
}

export const interactionHistory: InteractionEvent[] = [
  {
    id: 'i1',
    title: 'Reunión inicial',
    detail: 'Discovery de necesidades cloud y equipo interno.',
    dateLabel: '3 may 2024',
    owner: 'María López',
  },
  {
    id: 'i2',
    title: 'Propuesta enviada',
    detail: 'Se envió propuesta económica y técnica v2.',
    dateLabel: '15 may 2024',
    owner: 'Carlos Vega',
  },
  {
    id: 'i3',
    title: 'Llamada de seguimiento',
    detail: 'Validación del alcance MVP y SLA.',
    dateLabel: '22 may 2024',
    owner: 'María López',
  },
]

export const planUsage = {
  label: 'Plan Profesional',
  usedUsers: 16,
  limitUsers: 25,
}

export const dashboardDateRangeLabel = '1 – 31 May, 2024'

export function buildDashboardMock(): DashboardData {
  return getDashboardMock(defaultDashboardPeriodFromMock())
}

function defaultDashboardPeriodFromMock(): DashboardPeriod {
  return { mode: 'month', year: 2024, month: 4 }
}

function chartDescriptionForMock(period: DashboardPeriod): string {
  if (period.mode === 'years') return 'Comparación anual'
  if (period.mode === 'year') return 'Desglose mensual del año'
  return 'Últimos 6 meses'
}

export function getDashboardMock(period: DashboardPeriod): DashboardData {
  return {
    dateRangeLabel: labelForPeriod(period),
    chartDescription: chartDescriptionForMock(period),
    kpis: dashboardKpis,
    funnelStages,
    revenueExpenseSeries,
    pendingActivities,
    recentOpportunities,
    revenueBySource,
    tasksByProject,
  }
}
