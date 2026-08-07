import type { ContactActivity, ContactNote } from '@/data/contact-detail.mock'
import type { RecordAuditFields } from '@/lib/record-audit'
import { ensureRecordAuditList } from '@/lib/seed-audit'
import type { SolicitudFile } from '@/lib/solicitud-files'
import type { SolicitudStatusHistoryEntry } from '@/lib/solicitud-journey'

export type SolicitudStatus =
  | 'Nuevo'
  | 'En Proceso'
  | 'Detenido por cliente'
  | 'Detenido Internamente'
  | 'En espera de Cliente'
  | 'Entregado a Cliente'
  | 'Planificación'
  | 'Cerrado'

export type SolicitudPriority = 'Baja' | 'Media' | 'Alta' | 'Urgente'

export type SolicitudListTeamMember = {
  id: string
  name: string
  userId?: string
  role?: string
}

export type SolicitudListItem = {
  id: string
  code: string
  title: string
  description: string
  status: SolicitudStatus
  priority: SolicitudPriority
  assignee: string
  assigneeUserId?: string
  teamMembers?: SolicitudListTeamMember[]
  companyId?: string
  companyName?: string
  documentationUrl?: string
  gitBranchUrl?: string
} & RecordAuditFields

export type SolicitudTeamMember = {
  id: string
  name: string
  role: string
  userId?: string
}

export type SolicitudDetail = SolicitudListItem & {
  team: SolicitudTeamMember[]
  activities: ContactActivity[]
  notes: ContactNote[]
  files: SolicitudFile[]
  statusHistory: SolicitudStatusHistoryEntry[]
}

export const SOLICITUD_LIST_TOTAL_DEMO = 0

export const SOLICITUD_STATUS_OPTIONS: SolicitudStatus[] = [
  'Nuevo',
  'En Proceso',
  'Detenido por cliente',
  'Detenido Internamente',
  'En espera de Cliente',
  'Entregado a Cliente',
  'Planificación',
  'Cerrado',
]

export const SOLICITUD_PRIORITY_OPTIONS: SolicitudPriority[] = [
  'Baja',
  'Media',
  'Alta',
  'Urgente',
]

const solicitudListSeedRaw: Omit<SolicitudListItem, keyof RecordAuditFields>[] = []

export const solicitudListSeed = ensureRecordAuditList(
  solicitudListSeedRaw,
  (item) => item.assignee || '—',
)

export function resolveSolicitudListItem(id: string): SolicitudListItem {
  const direct = solicitudListSeed.find((s) => s.id === id)
  if (direct) return { ...direct, id }
  return {
    id,
    code: 'SOL-000',
    title: 'Solicitud',
    description: '',
    status: 'Nuevo',
    priority: 'Media',
    assignee: '—',
    createdAt: '',
    createdById: '',
    createdByName: '',
    updatedAt: '',
    updatedById: '',
    updatedByName: '',
  }
}
