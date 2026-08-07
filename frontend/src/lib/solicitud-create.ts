import { stampRecordAuditOnCreate } from '@/lib/record-audit'
import { serializeDescriptionHtml } from '@/lib/solicitud-description-media'
import type { SolicitudListItem } from '@/data/solicitudes.mock'
import {
  defaultSolicitudFormValues,
  type SolicitudFormValues,
} from '@/lib/solicitud-form'

export type CreateSolicitudFormValues = SolicitudFormValues

export function createDefaultSolicitudFormValues(
  partial?: Partial<CreateSolicitudFormValues>,
): CreateSolicitudFormValues {
  return defaultSolicitudFormValues(partial)
}

export function validateCreateSolicitudForm(values: CreateSolicitudFormValues): string | null {
  if (!values.title.trim()) return 'El título de la solicitud es obligatorio.'
  return null
}

export function createSolicitudId(): string {
  return `solicitud-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function nextDemoCode(existingCount: number): string {
  const n = existingCount + 1
  return `SOL-${String(n).padStart(3, '0')}`
}

export function formValuesToListItem(
  values: CreateSolicitudFormValues,
  id = createSolicitudId(),
  code = nextDemoCode(0),
): SolicitudListItem {
  return stampRecordAuditOnCreate({
    id,
    code,
    title: values.title.trim(),
    description: serializeDescriptionHtml(values.description),
    status: values.status,
    priority: values.priority,
    assignee: values.assigneeName.trim(),
    assigneeUserId: values.assigneeUserId?.trim() || undefined,
    documentationUrl: values.documentationUrl.trim() || undefined,
    gitBranchUrl: values.gitBranchUrl.trim() || undefined,
  })
}

export {
  SOLICITUD_STATUS_OPTIONS,
  SOLICITUD_PRIORITY_OPTIONS,
} from '@/data/solicitudes.mock'
