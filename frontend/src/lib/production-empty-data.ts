import type { BitacoraListItem } from '@/data/bitacora.mock'
import type { NpsReportResult } from '@/data/nps-report.mock'
import type { ProjectListItem } from '@/data/projects.mock'
import type { SolicitudListItem } from '@/data/solicitudes.mock'
import type { BitacoraDashboardStats } from '@/types/bitacora-dashboard'

/** Campos de auditoría vacíos para stubs mínimos. */
export const EMPTY_RECORD_AUDIT = {
  createdAt: '',
  createdById: '',
  createdByName: '',
  updatedAt: '',
  updatedById: '',
  updatedByName: '',
} as const

/** Usuario anónimo cuando no hay sesión (nunca datos demo). */
export const ANONYMOUS_CURRENT_USER = {
  id: '',
  name: '—',
  email: '',
} as const

export function emptyBitacoraDashboardStats(periodLabel = '—'): BitacoraDashboardStats {
  return {
    billableHours: 0,
    nonBillableHours: 0,
    totalHours: 0,
    entryCount: 0,
    billableSharePercent: 0,
    periodLabel,
    byMonth: [],
    bySolicitud: [],
    byCompany: [],
    byUser: [],
  }
}

export function emptyNpsReportResult(): NpsReportResult {
  return {
    generatedAt: new Date().toLocaleString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    overallNps: 0,
    totalResponses: 0,
    promotersPct: 0,
    passivesPct: 0,
    detractorsPct: 0,
    vsPreviousQuarter: 0,
    bySegment: [],
    trend: [],
    verbatims: [],
  }
}

export function minimalSolicitudListItem(id: string): SolicitudListItem {
  return {
    id,
    code: '—',
    title: '—',
    description: '',
    status: 'Nuevo',
    priority: 'Media',
    assignee: '—',
    ...EMPTY_RECORD_AUDIT,
  }
}

export function minimalProjectListItem(id: string): ProjectListItem {
  return {
    id,
    name: '—',
    client: '—',
    progress: '0%',
    progressNum: 0,
    deadline: '—',
    manager: '—',
    journeyStage: 'Planificación',
    status: 'En curso',
    priority: 'Media',
    health: 'En plazo',
    budget: '—',
    startDate: '—',
    ...EMPTY_RECORD_AUDIT,
  }
}

export function minimalBitacoraListItem(id: string): BitacoraListItem {
  return {
    id,
    solicitudId: '',
    solicitudCode: '—',
    solicitudTitle: '—',
    workDate: '',
    hours: 0,
    description: '',
    isBillable: false,
    nonBillableReason: null,
    assignedUserId: '',
    assignedUserName: '—',
    ...EMPTY_RECORD_AUDIT,
  }
}
