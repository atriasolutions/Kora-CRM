import { getCurrentUser } from '@/lib/current-user'
import type { BitacoraListItem } from '@/data/bitacora.mock'
import {
  auditNowIso,
  resolveUserDisplay,
  resolveUserIdByName,
  stampRecordAuditOnCreate,
  stampRecordAuditOnUpdate,
} from '@/lib/record-audit'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isBitacoraUserId(value: string | undefined): boolean {
  return Boolean(value?.trim() && UUID_RE.test(value.trim()))
}

export type BitacoraFormValues = {
  solicitudId: string
  solicitudCode: string
  solicitudTitle: string
  workDate: string
  hours: number
  description: string
  isBillable: boolean
  nonBillableReason: string
  assignedUserId: string
  assignedUserName: string
}

export function isValidBitacoraHours(hours: number): boolean {
  return Number.isFinite(hours) && hours >= 0.5 && hours * 2 === Math.round(hours * 2)
}

/** Resuelve el UUID del usuario asignado a partir del nombre en el directorio. */
export function prepareBitacoraFormForSubmit(values: BitacoraFormValues): BitacoraFormValues {
  const assigned = resolveUserDisplay(values.assignedUserId, values.assignedUserName)
  const assignedUserId =
    (isBitacoraUserId(assigned.id) ? assigned.id : '') ||
    (isBitacoraUserId(values.assignedUserId) ? values.assignedUserId.trim() : '') ||
    resolveUserIdByName(values.assignedUserName)
  return {
    ...values,
    assignedUserId,
    assignedUserName: assigned.name || values.assignedUserName.trim(),
  }
}

export function validateBitacoraForm(values: BitacoraFormValues): string | null {
  const prepared = prepareBitacoraFormForSubmit(values)
  if (!prepared.solicitudId.trim()) return 'Seleccione una solicitud.'
  if (!isBitacoraUserId(prepared.solicitudId)) return 'Seleccione una solicitud válida.'
  if (!prepared.workDate.trim()) return 'Indique la fecha de la bitácora.'
  if (!isValidBitacoraHours(prepared.hours)) {
    return 'Las horas deben ser múltiplos de 0,5 (mínimo 0,5).'
  }
  if (!prepared.assignedUserName.trim()) {
    return 'Seleccione el usuario asignado.'
  }
  if (!isBitacoraUserId(prepared.assignedUserId)) {
    return 'Seleccione un usuario válido del directorio.'
  }
  if (!prepared.isBillable && !prepared.nonBillableReason.trim()) {
    return 'Indique el motivo cuando las horas no son facturables.'
  }
  return null
}

export function createDefaultBitacoraFormValues(
  partial?: Partial<BitacoraFormValues>,
): BitacoraFormValues {
  const user = getCurrentUser()
  const today = new Date().toISOString().slice(0, 10)
  return {
    solicitudId: '',
    solicitudCode: '',
    solicitudTitle: '',
    workDate: today,
    hours: 1,
    description: '',
    isBillable: true,
    nonBillableReason: '',
    assignedUserId: user.id,
    assignedUserName: user.name,
    ...partial,
  }
}

export function bitacoraInitialFromSolicitud(input: {
  id: string
  code: string
  title: string
  assignee?: string
  assigneeUserId?: string
}): Partial<BitacoraFormValues> {
  const user = getCurrentUser()
  const assignee = resolveUserDisplay(input.assigneeUserId ?? '', input.assignee)
  return {
    solicitudId: input.id,
    solicitudCode: input.code,
    solicitudTitle: input.title,
    assignedUserId: assignee.id || user.id,
    assignedUserName: assignee.name || user.name,
  }
}

export function formValuesToBitacoraListItem(
  values: BitacoraFormValues,
  id?: string,
): BitacoraListItem {
  const assigned = resolveUserDisplay(values.assignedUserId, values.assignedUserName)
  const base: BitacoraListItem = {
    id: id ?? crypto.randomUUID(),
    solicitudId: values.solicitudId.trim(),
    solicitudCode: values.solicitudCode.trim(),
    solicitudTitle: values.solicitudTitle.trim(),
    workDate: values.workDate,
    hours: values.hours,
    description: values.description.trim(),
    isBillable: values.isBillable,
    nonBillableReason: values.isBillable ? null : values.nonBillableReason.trim() || null,
    assignedUserId: assigned.id,
    assignedUserName: assigned.name,
    createdAt: auditNowIso(),
    createdById: getCurrentUser().id,
    createdByName: getCurrentUser().name,
    updatedAt: auditNowIso(),
    updatedById: getCurrentUser().id,
    updatedByName: getCurrentUser().name,
  }
  return id ? stampRecordAuditOnUpdate(base) : stampRecordAuditOnCreate(base)
}

export function listItemFromBitacoraDetail(detail: BitacoraListItem): BitacoraListItem {
  return { ...detail }
}

export function applyFormValuesToBitacora(
  existing: BitacoraListItem,
  values: BitacoraFormValues,
): BitacoraListItem {
  const assigned = resolveUserDisplay(values.assignedUserId, values.assignedUserName)
  return stampRecordAuditOnUpdate({
    ...existing,
    solicitudId: values.solicitudId.trim(),
    solicitudCode: values.solicitudCode.trim(),
    solicitudTitle: values.solicitudTitle.trim(),
    workDate: values.workDate,
    hours: values.hours,
    description: values.description.trim(),
    isBillable: values.isBillable,
    nonBillableReason: values.isBillable ? null : values.nonBillableReason.trim() || null,
    assignedUserId: assigned.id,
    assignedUserName: assigned.name,
  })
}

export function bitacoraDetailToFormValues(detail: BitacoraListItem): BitacoraFormValues {
  return {
    solicitudId: detail.solicitudId,
    solicitudCode: detail.solicitudCode,
    solicitudTitle: detail.solicitudTitle,
    workDate: detail.workDate,
    hours: detail.hours,
    description: detail.description,
    isBillable: detail.isBillable,
    nonBillableReason: detail.nonBillableReason ?? '',
    assignedUserId: detail.assignedUserId,
    assignedUserName: detail.assignedUserName,
  }
}

export function formatBitacoraHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace('.', ',')
}

export function formatBitacoraWorkDate(isoDate: string): string {
  if (!isoDate) return '—'
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return isoDate
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
