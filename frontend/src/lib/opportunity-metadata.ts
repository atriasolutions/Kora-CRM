import type {
  ForecastCategory,
  OpportunityStage,
  OpportunityType,
} from '@/data/opportunities.mock'
import type { OpportunityCustomerKind } from '@/lib/opportunity-customer'

/** Origen comercial de la oportunidad (picklist). */
export const OPPORTUNITY_SOURCE_OPTIONS = [
  'Formulario web',
  'Llamada entrante',
  'Email frío',
  'Referido',
  'Cuenta existente',
  'Socio / canal',
  'Evento / feria',
  'LinkedIn',
  'Otro',
] as const

export type OpportunitySource = (typeof OPPORTUNITY_SOURCE_OPTIONS)[number]

export const OPPORTUNITY_TYPE_OPTIONS: OpportunityType[] = [
  'Nuevo negocio',
  'Renovación',
  'Ampliación',
  'Venta cruzada',
]

export const FORECAST_OPTIONS: ForecastCategory[] = [
  'En pipeline',
  'Mejor escenario',
  'Comprometido',
]

export const FORECAST_FIELD_LABEL = 'Escenario de pronóstico'

export const FORECAST_FIELD_HINT =
  'Clasifica la confianza del cierre en la previsión de ventas: exploratorio, optimista o comprometido.'

export const OPPORTUNITY_QUALIFICATION_SECTION_HINT =
  'Datos para calificar la oportunidad y anticipar cómo cerrará el negocio. Todos los campos son opcionales.'

export const DECISION_MAKER_FIELD_HINT =
  'Persona que puede firmar o autorizar la compra (nombre y cargo). No es necesariamente el contacto operativo del día a día.'

export const DECISION_MAKER_FIELD_PLACEHOLDER =
  'Ej. María López, Gerente de Operaciones'

export const COMPETITORS_FIELD_HINT =
  'Otras empresas o alternativas que el cliente está evaluando (incluida la opción de no comprar).'

export const BUDGET_FIELD_HINT =
  'Rango o monto que el cliente indicó tener disponible para este proyecto (texto libre).'

export const BUYING_PROCESS_FIELD_HINT =
  'Pasos que debe cumplir el cliente para comprar: aprobaciones, licitación, comité, plazos, documentos, etc.'

export const BUYING_PROCESS_FIELD_PLACEHOLDER =
  'Ej. Cotización → aprobación gerencia → orden de compra en 15 días'

export const OPPORTUNITY_DESCRIPTION_FIELD_HINT =
  'Contexto adicional: necesidad, alcance, objeciones o próximos pasos acordados.'

const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
  Calificados: 10,
  'En diagnóstico': 20,
  Propuesta: 40,
  Negociación: 60,
  Cerrada: 100,
  'En espera cliente': 50,
  'Pausada internamente': 25,
  Perdida: 0,
  'No calificada': 0,
}

export function probabilityLabelForStage(stage: OpportunityStage): string {
  const pct = STAGE_PROBABILITY[stage] ?? 10
  return `${pct}%`
}

export function probabilityPercentForStage(stage: OpportunityStage): number {
  return STAGE_PROBABILITY[stage] ?? 10
}

export function defaultEstimatedCloseDate(daysAhead = 30): string {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function buildDefaultOpportunityName(params: {
  customerKind: OpportunityCustomerKind
  company: string
  contactName: string
  date?: Date
}): string {
  const client =
    params.customerKind === 'empresa'
      ? params.company.trim() || params.contactName.trim()
      : params.contactName.trim()
  if (!client) return ''

  const date = params.date ?? new Date()
  const dateLabel = date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${client} · ${dateLabel}`
}

export function normalizeOpportunitySource(source: string): string {
  const legacy: Record<string, string> = {
    Inbound: 'Formulario web',
    Outbound: 'Email frío',
    Partner: 'Socio / canal',
  }
  const trimmed = source.trim()
  if (!trimmed) return OPPORTUNITY_SOURCE_OPTIONS[0]
  const mapped = legacy[trimmed]
  if (mapped) return mapped
  if ((OPPORTUNITY_SOURCE_OPTIONS as readonly string[]).includes(trimmed)) return trimmed
  return trimmed
}

export function normalizeOpportunityType(type: string): OpportunityType {
  const legacy: Record<string, OpportunityType> = {
    Upsell: 'Ampliación',
    'Cross-sell': 'Venta cruzada',
  }
  const mapped = legacy[type]
  if (mapped) return mapped
  if ((OPPORTUNITY_TYPE_OPTIONS as readonly string[]).includes(type as OpportunityType)) {
    return type as OpportunityType
  }
  return 'Nuevo negocio'
}

export function normalizeForecastCategory(value: string): ForecastCategory {
  const legacy: Record<string, ForecastCategory> = {
    Pipeline: 'En pipeline',
    'Best case': 'Mejor escenario',
    Commit: 'Comprometido',
  }
  const mapped = legacy[value]
  if (mapped) return mapped
  if ((FORECAST_OPTIONS as readonly string[]).includes(value as ForecastCategory)) {
    return value as ForecastCategory
  }
  return 'En pipeline'
}

/** Monto mostrado en oportunidades sin cotización vinculada. */
export const OPPORTUNITY_AMOUNT_PENDING = 'Sin cotizar'
