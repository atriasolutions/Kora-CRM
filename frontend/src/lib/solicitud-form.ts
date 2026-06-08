import type { SolicitudDetail } from '@/data/solicitudes.mock'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import type {
  SolicitudListItem,
  SolicitudPriority,
  SolicitudStatus,
} from '@/data/solicitudes.mock'
import {
  SOLICITUD_PRIORITY_OPTIONS,
  SOLICITUD_STATUS_OPTIONS,
} from '@/data/solicitudes.mock'

export type SolicitudFormValues = {
  title: string
  description: string
  status: SolicitudStatus
  priority: SolicitudPriority
  assigneeName: string
  assigneeUserId: string
}

export { SOLICITUD_STATUS_OPTIONS, SOLICITUD_PRIORITY_OPTIONS }

export function defaultSolicitudFormValues(
  partial?: Partial<SolicitudFormValues>,
): SolicitudFormValues {
  return {
    title: '',
    description: '',
    status: 'Nuevo',
    priority: 'Media',
    assigneeName: '',
    assigneeUserId: '',
    ...partial,
  }
}

export function validateSolicitudForm(values: SolicitudFormValues): string | null {
  if (!values.title.trim()) return 'El título de la solicitud es obligatorio.'
  return null
}

export function solicitudDetailToFormValues(solicitud: SolicitudDetail): SolicitudFormValues {
  return {
    title: solicitud.title,
    description: solicitud.description,
    status: solicitud.status,
    priority: solicitud.priority,
    assigneeName: solicitud.assignee,
    assigneeUserId: solicitud.assigneeUserId ?? '',
  }
}

export function applyFormValuesToSolicitud(
  solicitud: SolicitudDetail,
  values: SolicitudFormValues,
): SolicitudDetail {
  return {
    ...solicitud,
    title: values.title.trim(),
    description: values.description.trim(),
    status: values.status,
    priority: values.priority,
    assignee: values.assigneeName.trim(),
    assigneeUserId: values.assigneeUserId.trim() || undefined,
  }
}

export function listItemFromSolicitudDetail(solicitud: SolicitudDetail): SolicitudListItem {
  const {
    description,
    team: _tm,
    activities: _a,
    notes: _n,
    files: _f,
    ...list
  } = solicitud
  return stampRecordAuditOnUpdate({
    ...list,
    description,
    teamMembers: solicitud.team.map((m) => ({
      id: m.id,
      name: m.name,
      userId: m.userId,
      role: m.role,
    })),
  })
}
