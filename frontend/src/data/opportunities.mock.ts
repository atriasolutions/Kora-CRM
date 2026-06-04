import type { RecordAuditFields } from '@/lib/record-audit'
import { ensureRecordAuditList } from '@/lib/seed-audit'

import {
  OPPORTUNITY_JOURNEY_STAGE_OPTIONS,
  type OpportunityStage,
} from '@/lib/opportunity-journey'
import type { OpportunityCustomerKind } from '@/lib/opportunity-customer'

export type { OpportunityStage }

export type OpportunityType =
  | 'Nuevo negocio'
  | 'Renovación'
  | 'Ampliación'
  | 'Venta cruzada'
export type OpportunityPriority = 'Alta' | 'Media' | 'Baja'
export type OpportunityOutcome = 'Abierta' | 'Ganada' | 'Perdida'
export type ForecastCategory = 'En pipeline' | 'Mejor escenario' | 'Comprometido'

export type OpportunityListItem = {
  id: string
  name: string
  /** B2B (empresa) o B2C (persona); define cómo se arrastra a cotizaciones. */
  customerKind?: OpportunityCustomerKind
  company: string
  companyId?: string
  contactId?: string
  contactName: string
  amount: string
  weightedAmount: string
  stage: OpportunityStage
  probability: string
  closeDate: string
  owner: string
  type: OpportunityType
  priority: OpportunityPriority
  outcome: OpportunityOutcome
  forecast: ForecastCategory
  source: string
  lastActivity: string
} & RecordAuditFields

/** @deprecated alias */
export type OpportunityRecord = OpportunityListItem

export const OPPORTUNITY_STAGE_OPTIONS: OpportunityStage[] = OPPORTUNITY_JOURNEY_STAGE_OPTIONS

export const OPPORTUNITY_LIST_TOTAL_DEMO = 128

const companyIds: Record<string, string> = {
  'Tech Solutions': 'co1',
  'Nova Retail': 'co2',
  'Industrial Plus': 'co3',
  BlueWave: 'co4',
  FinNova: 'co5',
  AgroSur: 'co6',
  'Logistics Co': 'co7',
  'MedLab Digital': 'co8',
}

function weighted(amount: string, probability: string): string {
  const num = Number.parseInt(amount.replace(/[^\d]/g, ''), 10) || 0
  const pct = Number.parseInt(probability.replace(/[^\d]/g, ''), 10) || 0
  return `$${Math.round((num * pct) / 100).toLocaleString('es-CL')}`
}

const opportunityListSeedRaw: Omit<OpportunityListItem, keyof RecordAuditFields>[] = [
  {
    id: 'op1',
    name: 'Expansión cloud',
    customerKind: 'empresa',
    company: 'Tech Solutions',
    companyId: companyIds['Tech Solutions'],
    contactId: 'c1',
    contactName: 'Juan Pérez',
    amount: '$55,400',
    weightedAmount: weighted('$55,400', '60%'),
    stage: 'Propuesta',
    probability: '60%',
    closeDate: '30 jun 2024',
    owner: 'María López',
    type: 'Ampliación',
    priority: 'Alta',
    outcome: 'Abierta',
    forecast: 'Comprometido',
    source: 'Formulario web',
    lastActivity: 'Hoy · Email',
  },
  {
    id: 'op2',
    name: 'Renovación anual ERP',
    customerKind: 'empresa',
    company: 'Industrial Plus',
    companyId: companyIds['Industrial Plus'],
    contactId: 'c3',
    contactName: 'Carlos Vega',
    amount: '$128,900',
    weightedAmount: weighted('$128,900', '75%'),
    stage: 'Negociación',
    probability: '75%',
    closeDate: '15 jul 2024',
    owner: 'Carlos Vega',
    type: 'Renovación',
    priority: 'Alta',
    outcome: 'Abierta',
    forecast: 'Comprometido',
    source: 'Cuenta existente',
    lastActivity: 'Ayer · Reunión',
  },
  {
    id: 'op3',
    name: 'Onboarding ventas LATAM',
    customerKind: 'empresa',
    company: 'Nova Retail',
    companyId: companyIds['Nova Retail'],
    contactId: 'c2',
    contactName: 'María González',
    amount: '$18,200',
    weightedAmount: weighted('$18,200', '35%'),
    stage: 'En diagnóstico',
    probability: '35%',
    closeDate: '20 ago 2024',
    owner: 'Ana Ruiz',
    type: 'Nuevo negocio',
    priority: 'Media',
    outcome: 'Abierta',
    forecast: 'En pipeline',
    source: 'Email frío',
    lastActivity: '12 may · Llamada',
  },
  {
    id: 'op4',
    name: 'Integración Shopify',
    customerKind: 'empresa',
    company: 'BlueWave',
    companyId: companyIds.BlueWave,
    contactId: 'c4',
    contactName: 'Ana Ruiz',
    amount: '$32,650',
    weightedAmount: weighted('$32,650', '50%'),
    stage: 'Propuesta',
    probability: '50%',
    closeDate: '10 jun 2024',
    owner: 'María López',
    type: 'Nuevo negocio',
    priority: 'Media',
    outcome: 'Abierta',
    forecast: 'Mejor escenario',
    source: 'Socio / canal',
    lastActivity: '10 may · Demo',
  },
  {
    id: 'op5',
    name: 'Licencias enterprise',
    customerKind: 'empresa',
    company: 'Logistics Co',
    companyId: companyIds['Logistics Co'],
    contactName: 'Roberto Sánchez',
    amount: '$210,000',
    weightedAmount: weighted('$210,000', '80%'),
    stage: 'Negociación',
    probability: '80%',
    closeDate: '5 jul 2024',
    owner: 'Roberto Sánchez',
    type: 'Ampliación',
    priority: 'Alta',
    outcome: 'Abierta',
    forecast: 'Comprometido',
    source: 'Referido',
    lastActivity: '6 may · WhatsApp',
  },
  {
    id: 'op6',
    name: 'Piloto analytics',
    customerKind: 'empresa',
    company: 'MedLab Digital',
    companyId: companyIds['MedLab Digital'],
    contactName: 'Valentina Torres',
    amount: '$9,800',
    weightedAmount: weighted('$9,800', '25%'),
    stage: 'Calificados',
    probability: '25%',
    closeDate: '1 sep 2024',
    owner: 'Valentina Torres',
    type: 'Nuevo negocio',
    priority: 'Baja',
    outcome: 'Abierta',
    forecast: 'En pipeline',
    source: 'Formulario web',
    lastActivity: '5 may · Email',
  },
  {
    id: 'op7',
    name: 'Soporte premium',
    customerKind: 'empresa',
    company: 'AgroSur',
    companyId: companyIds.AgroSur,
    contactName: 'María González',
    amount: '$42,000',
    weightedAmount: weighted('$42,000', '100%'),
    stage: 'Cerrada',
    probability: '100%',
    closeDate: '2 may 2024',
    owner: 'Laura Fernández',
    type: 'Renovación',
    priority: 'Media',
    outcome: 'Ganada',
    forecast: 'Comprometido',
    source: 'Cuenta existente',
    lastActivity: '2 may · Cierre',
  },
  {
    id: 'op8',
    name: 'Migración datos',
    customerKind: 'empresa',
    company: 'FinNova',
    companyId: companyIds.FinNova,
    contactName: 'Carlos Vega',
    amount: '$67,500',
    weightedAmount: weighted('$67,500', '45%'),
    stage: 'En espera cliente',
    probability: '45%',
    closeDate: '18 jun 2024',
    owner: 'Diego Méndez',
    type: 'Venta cruzada',
    priority: 'Media',
    outcome: 'Abierta',
    forecast: 'Mejor escenario',
    source: 'Email frío',
    lastActivity: '8 may · Propuesta',
  },
]

export const opportunityListSeed: OpportunityListItem[] = ensureRecordAuditList(
  opportunityListSeedRaw,
  (x) => x.owner,
)

export function opportunitiesForCompany(
  companyName: string,
  companyId?: string,
): OpportunityListItem[] {
  return opportunityListSeed.filter((o) => {
    if (companyId && o.companyId === companyId) return true
    return o.company === companyName
  })
}

export function opportunityById(id: string): OpportunityListItem | undefined {
  return opportunityListSeed.find((o) => o.id === id)
}
