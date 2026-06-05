import type { RecordAuditFields } from '@/lib/record-audit'
import { ensureRecordAuditList } from '@/lib/seed-audit'

import type { ProjectJourneyStage } from '@/lib/project-journey'

export type ProjectStatus = 'En curso' | 'Completado' | 'Pausado'
export type ProjectHealth = 'En plazo' | 'En riesgo' | 'Retrasado'
export type ProjectPriority = 'Alta' | 'Media' | 'Baja'

export type ProjectCustomerKind = 'empresa' | 'contacto'

export type ProjectListItem = {
  id: string
  name: string
  client: string
  /** B2B/B2C cuando se eligió tipo de cliente explícito. */
  customerKind?: ProjectCustomerKind
  companyId?: string
  contactId?: string
  contactName?: string
  /** Oportunidad ganada o comprometida que originó el proyecto */
  opportunityId?: string
  /** Cotización aceptada que fija alcance y presupuesto (debe ser de la misma oportunidad) */
  acceptedQuoteId?: string
  progress: string
  progressNum: number
  deadline: string
  manager: string
  /** Etapa en la ruta del éxito */
  journeyStage: ProjectJourneyStage
  /** Resumen para kanban (derivado de journeyStage) */
  status: ProjectStatus
  priority: ProjectPriority
  health: ProjectHealth
  budget: string
  startDate: string
  /** Miembros con acceso al proyecto (pestaña Equipo). */
  teamMembers?: { id: string; name: string; userId?: string; role?: string }[]
} & RecordAuditFields

export const PROJECT_LIST_TOTAL_DEMO = 42

export const PROJECT_STATUS_OPTIONS: ProjectStatus[] = ['En curso', 'Pausado', 'Completado']

export const PROJECT_PRIORITY_OPTIONS: ProjectPriority[] = ['Alta', 'Media', 'Baja']

export const PROJECT_HEALTH_OPTIONS: ProjectHealth[] = ['En plazo', 'En riesgo', 'Retrasado']

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

const projectListSeedRaw: Omit<ProjectListItem, keyof RecordAuditFields>[] = [
  {
    id: 'pr1',
    name: 'Implementación SaaS Core',
    client: 'Tech Solutions',
    companyId: companyIds['Tech Solutions'],
    progress: '75%',
    progressNum: 75,
    deadline: '30 jun 2024',
    manager: 'María López',
    journeyStage: 'En Proceso',
    status: 'En curso',
    priority: 'Alta',
    health: 'En plazo',
    budget: '$120,000',
    startDate: '15 mar 2024',
    opportunityId: 'op1',
    acceptedQuoteId: 'qt1',
  },
  {
    id: 'pr2',
    name: 'Migración datos ERP',
    client: 'Industrial Plus',
    companyId: companyIds['Industrial Plus'],
    progress: '60%',
    progressNum: 60,
    deadline: '15 ago 2024',
    manager: 'Carlos Vega',
    journeyStage: 'Detenido por Cliente',
    status: 'Pausado',
    priority: 'Alta',
    health: 'En riesgo',
    budget: '$85,000',
    startDate: '1 abr 2024',
    opportunityId: 'op2',
    acceptedQuoteId: 'qt3',
  },
  {
    id: 'pr3',
    name: 'Capacitación ventas LATAM',
    client: 'Nova Retail',
    companyId: companyIds['Nova Retail'],
    progress: '30%',
    progressNum: 30,
    deadline: '1 sep 2024',
    manager: 'Ana Ruiz',
    journeyStage: 'En Levantamiento',
    status: 'En curso',
    priority: 'Media',
    health: 'En plazo',
    budget: '$32,000',
    startDate: '20 abr 2024',
  },
  {
    id: 'pr4',
    name: 'Integración Shopify + POS',
    client: 'BlueWave',
    companyId: companyIds.BlueWave,
    progress: '90%',
    progressNum: 90,
    deadline: '20 jun 2024',
    manager: 'María López',
    journeyStage: 'Entregado a Cliente',
    status: 'Completado',
    priority: 'Alta',
    health: 'En plazo',
    budget: '$48,500',
    startDate: '10 feb 2024',
    opportunityId: 'op4',
    acceptedQuoteId: 'qt4',
  },
  {
    id: 'pr5',
    name: 'Portal proveedores',
    client: 'AgroSur',
    companyId: companyIds.AgroSur,
    progress: '100%',
    progressNum: 100,
    deadline: '10 may 2024',
    manager: 'Laura Fernández',
    journeyStage: 'Cerrado',
    status: 'Completado',
    priority: 'Media',
    health: 'En plazo',
    budget: '$56,000',
    startDate: '5 ene 2024',
  },
  {
    id: 'pr6',
    name: 'Dashboard ejecutivo',
    client: 'Logistics Co',
    companyId: companyIds['Logistics Co'],
    progress: '45%',
    progressNum: 45,
    deadline: '5 jul 2024',
    manager: 'Roberto Sánchez',
    journeyStage: 'Detenido internamente',
    status: 'Pausado',
    priority: 'Baja',
    health: 'Retrasado',
    budget: '$28,000',
    startDate: '18 mar 2024',
  },
  {
    id: 'pr7',
    name: 'App móvil pacientes',
    client: 'MedLab Digital',
    companyId: companyIds['MedLab Digital'],
    progress: '20%',
    progressNum: 20,
    deadline: '30 oct 2024',
    manager: 'Valentina Torres',
    journeyStage: 'Nuevo',
    status: 'En curso',
    priority: 'Media',
    health: 'En plazo',
    budget: '$95,000',
    startDate: '1 may 2024',
  },
  {
    id: 'pr8',
    name: 'Auditoría seguridad',
    client: 'FinNova',
    companyId: companyIds.FinNova,
    progress: '55%',
    progressNum: 55,
    deadline: '18 jul 2024',
    manager: 'Diego Méndez',
    journeyStage: 'En Espera Cliente',
    status: 'Pausado',
    priority: 'Alta',
    health: 'En riesgo',
    budget: '$41,000',
    startDate: '22 abr 2024',
    opportunityId: 'op8',
    acceptedQuoteId: 'qt10',
  },
]

export const projectListSeed: ProjectListItem[] = ensureRecordAuditList(
  projectListSeedRaw,
  (x) => x.manager,
)
