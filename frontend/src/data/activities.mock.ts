import type { RecordAuditFields } from '@/lib/record-audit'
import { ensureRecordAuditList } from '@/lib/seed-audit'

import type { ContactActivityType } from '@/data/contact-detail.mock'
import { activityTypeLabel } from '@/lib/activity-type-label'
import type { ActivityReminderPreset } from '@/lib/activity-reminder'

export type ActivityStatus = 'Pendiente' | 'En curso' | 'Completada' | 'Vencida'
export type ActivityPriority = 'Alta' | 'Media' | 'Baja'
export type ActivityRelatedType =
  | 'contacto'
  | 'empresa'
  | 'oportunidad'
  | 'cotizacion'
  | 'compra'
  | 'factura'
  | 'proyecto'
  | 'solicitud'
  | 'ingreso'
  | 'producto'
  | 'inventario'

export type ActivityListItem = {
  id: string
  title: string
  type: ContactActivityType
  typeLabel: string
  relatedType: ActivityRelatedType
  relatedId: string
  relatedName: string
  companyName: string
  due: string
  assignee: string
  status: ActivityStatus
  priority: ActivityPriority
  createdAt: string
  /** Texto mostrado en detalle (ej. «1 hora antes») */
  reminder?: string
  /** Fecha/hora de la actividad (`datetime-local`) */
  scheduledAt?: string
  /** ISO del momento en que debe recordarse */
  reminderAt?: string
  reminderPreset?: ActivityReminderPreset
  reminderCustomAt?: string
  /** Texto libre / resultado de interacción. */
  description?: string
  interactionKind?: 'outreach' | 'scheduled'
  outreachResult?: import('@/lib/contact-outreach').ContactOutreachResult
} & RecordAuditFields

export const ACTIVITY_LIST_TOTAL_DEMO = 264

export const ACTIVITY_STATUS_OPTIONS: ActivityStatus[] = [
  'Pendiente',
  'En curso',
  'Vencida',
  'Completada',
]

export const ACTIVITY_PRIORITY_OPTIONS: ActivityPriority[] = ['Alta', 'Media', 'Baja']

type ActivityListItemSeed = Omit<ActivityListItem, keyof RecordAuditFields> & {
  /** Fecha demo para migrar a auditoría ISO */
  seedDate?: string
}

function item(
  partial: Omit<ActivityListItemSeed, 'typeLabel'> & { type: ContactActivityType },
): ActivityListItemSeed {
  return { ...partial, typeLabel: activityTypeLabel(partial.type) }
}

const activityListSeedRaw: ActivityListItemSeed[] = [
  item({
    id: 'a1',
    title: 'Llamar a Juan Pérez',
    type: 'llamada',
    relatedType: 'contacto',
    relatedId: 'c1',
    relatedName: 'Juan Pérez',
    companyName: 'Tech Solutions',
    due: 'Hoy, 14:30',
    assignee: 'María López',
    status: 'Pendiente',
    priority: 'Alta',
    seedDate: '16 may 2024',
  }),
  item({
    id: 'a2',
    title: 'Enviar propuesta v2',
    type: 'email',
    relatedType: 'oportunidad',
    relatedId: 'op2',
    relatedName: 'Renovación anual ERP',
    companyName: 'Industrial Plus',
    due: 'Hoy, 17:00',
    assignee: 'Carlos Vega',
    status: 'Pendiente',
    priority: 'Alta',
    seedDate: '15 may 2024',
  }),
  item({
    id: 'a3',
    title: 'Demo producto',
    type: 'reunion',
    relatedType: 'empresa',
    relatedId: 'co2',
    relatedName: 'Nova Retail',
    companyName: 'Nova Retail',
    due: 'Mañana, 10:15',
    assignee: 'Ana Ruiz',
    status: 'En curso',
    priority: 'Media',
    seedDate: '14 may 2024',
  }),
  item({
    id: 'a4',
    title: 'Seguimiento contrato',
    type: 'nota',
    relatedType: 'oportunidad',
    relatedId: 'op4',
    relatedName: 'Integración Shopify',
    companyName: 'BlueWave',
    due: '12 may, 09:00',
    assignee: 'María López',
    status: 'Vencida',
    priority: 'Media',
    seedDate: '10 may 2024',
  }),
  item({
    id: 'a5',
    title: 'Revisión SLA',
    type: 'llamada',
    relatedType: 'empresa',
    relatedId: 'co7',
    relatedName: 'Logistics Co',
    companyName: 'Logistics Co',
    due: '15 may, 11:30',
    assignee: 'Roberto Sánchez',
    status: 'Completada',
    priority: 'Baja',
    seedDate: '8 may 2024',
  }),
  item({
    id: 'a6',
    title: 'Workshop onboarding',
    type: 'reunion',
    relatedType: 'contacto',
    relatedId: 'c6',
    relatedName: 'Laura Fernández',
    companyName: 'AgroSur',
    due: '20 may, 15:00',
    assignee: 'Laura Fernández',
    status: 'Pendiente',
    priority: 'Media',
    seedDate: '12 may 2024',
  }),
  item({
    id: 'a7',
    title: 'Email bienvenida',
    type: 'email',
    relatedType: 'contacto',
    relatedId: 'c8',
    relatedName: 'Valentina Torres',
    companyName: 'MedLab Digital',
    due: '8 may, 08:00',
    assignee: 'Valentina Torres',
    status: 'Completada',
    priority: 'Baja',
    seedDate: '7 may 2024',
  }),
  item({
    id: 'a8',
    title: 'Check-in trimestral',
    type: 'llamada',
    relatedType: 'oportunidad',
    relatedId: 'op8',
    relatedName: 'Migración datos',
    companyName: 'FinNova',
    due: '22 may, 16:00',
    assignee: 'Diego Méndez',
    status: 'Pendiente',
    priority: 'Alta',
    seedDate: '13 may 2024',
  }),
  item({
    id: 'a9',
    title: 'Seguimiento cotización COT-0142',
    type: 'email',
    relatedType: 'cotizacion',
    relatedId: 'qt1',
    relatedName: 'COT-2024-0142',
    companyName: 'Tech Solutions',
    due: '18 may, 09:30',
    assignee: 'María López',
    status: 'Pendiente',
    priority: 'Alta',
    seedDate: '17 may 2024',
  }),
  item({
    id: 'a10',
    title: 'WhatsApp recordatorio pago',
    type: 'whatsapp',
    relatedType: 'contacto',
    relatedId: 'c3',
    relatedName: 'Ana Ruiz',
    companyName: 'Industrial Plus',
    due: '19 may, 12:00',
    assignee: 'Carlos Vega',
    status: 'Pendiente',
    priority: 'Media',
    seedDate: '16 may 2024',
  }),
  item({
    id: 'a11',
    title: 'Confirmar recepción parcial OC',
    type: 'llamada',
    relatedType: 'compra',
    relatedId: 'pur1',
    relatedName: 'OC-2024-0182',
    companyName: 'BlueWave',
    due: '20 may, 10:00',
    assignee: 'María López',
    status: 'Pendiente',
    priority: 'Alta',
    seedDate: '18 may 2024',
  }),
  item({
    id: 'a12',
    title: 'Seguimiento cobro factura',
    type: 'email',
    relatedType: 'factura',
    relatedId: 'inv1',
    relatedName: 'FAC-2024-0842',
    companyName: 'Tech Solutions',
    due: 'Hoy, 11:00',
    assignee: 'María López',
    status: 'Pendiente',
    priority: 'Alta',
    seedDate: '16 may 2024',
  }),
  item({
    id: 'a13',
    title: 'Comité de avance proyecto',
    type: 'reunion',
    relatedType: 'proyecto',
    relatedId: 'pr1',
    relatedName: 'Implementación SaaS Core',
    companyName: 'Tech Solutions',
    due: 'Mañana, 09:00',
    assignee: 'María López',
    status: 'En curso',
    priority: 'Media',
    seedDate: '15 may 2024',
  }),
  item({
    id: 'a14',
    title: 'Validar ingreso en bodega',
    type: 'llamada',
    relatedType: 'ingreso',
    relatedId: 'sr1',
    relatedName: 'ING-2024-0012',
    companyName: 'BlueWave',
    due: '18 may, 14:30',
    assignee: 'María López',
    status: 'Completada',
    priority: 'Alta',
    seedDate: '18 may 2024',
  }),
  item({
    id: 'a15',
    title: 'Revisión ficha de producto',
    type: 'nota',
    relatedType: 'producto',
    relatedId: 'prod1',
    relatedName: 'Plan Starter',
    companyName: 'Kora',
    due: '12 may, 16:00',
    assignee: 'Carlos Vega',
    status: 'Pendiente',
    priority: 'Media',
    seedDate: '12 may 2024',
  }),
  item({
    id: 'a16',
    title: 'Conteo cíclico inventario',
    type: 'nota',
    relatedType: 'inventario',
    relatedId: 'inv1',
    relatedName: 'Plan Business',
    companyName: 'Kora',
    due: '10 may, 08:30',
    assignee: 'Ana Ruiz',
    status: 'Completada',
    priority: 'Baja',
    seedDate: '10 may 2024',
  }),
]

export const activityListSeed: ActivityListItem[] = ensureRecordAuditList(
  activityListSeedRaw,
  (x) => x.assignee,
  (x) => x.seedDate,
)
