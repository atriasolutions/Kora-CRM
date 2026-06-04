import type { ActivityListItem } from '@/data/activities.mock'
import type { ContactActivity, ContactActivityType } from '@/data/contact-detail.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import type { CreateActivityFormValues } from '@/lib/activity-create'
import {
  activityTypeLabel,
  formatActivityWhenLabel,
  toDatetimeLocalValue,
} from '@/lib/contact-activity'
import { listItemToContactActivity } from '@/lib/contact-activities'
import { getCurrentUserName } from '@/lib/current-user'
import { defaultDurationFieldForType } from '@/lib/entity-activity-form'

export type ContactOutreachResult =
  | 'contactado'
  | 'sin_respuesta'
  | 'reagendar'
  | 'datos_invalidos'

export type ContactReachabilityStatus = 'unknown' | 'ok' | 'invalid'

/** Estado usado en filtros y badges de lista. */
export type ContactOutreachFilterStatus =
  | 'sin_contactar'
  | 'contactado'
  | 'sin_respuesta'
  | 'reagendar'
  | 'datos_invalidos'

export type ContactOutreachFormValues = {
  occurredAt: string
  channel: ContactActivityType
  result: ContactOutreachResult
  notes: string
}

export const CONTACT_OUTREACH_RESULT_OPTIONS: {
  value: ContactOutreachResult
  label: string
  description: string
}[] = [
  {
    value: 'contactado',
    label: 'Contactado',
    description: 'Hubo conversación o respuesta útil.',
  },
  {
    value: 'sin_respuesta',
    label: 'Sin respuesta',
    description: 'Se intentó contactar pero no hubo respuesta.',
  },
  {
    value: 'reagendar',
    label: 'Reagendar',
    description: 'No se contactó ahora; acordaron otro momento.',
  },
  {
    value: 'datos_invalidos',
    label: 'Datos inválidos',
    description: 'Teléfono, email u otro dato no funciona.',
  },
]

export function outreachResultLabel(result: ContactOutreachResult): string {
  return (
    CONTACT_OUTREACH_RESULT_OPTIONS.find((o) => o.value === result)?.label ?? result
  )
}

export function outreachFilterStatusLabel(status: ContactOutreachFilterStatus): string {
  if (status === 'sin_contactar') return 'Sin contactar'
  return outreachResultLabel(status)
}

export function createDefaultOutreachFormValues(
  presetChannel: ContactActivityType = 'llamada',
): ContactOutreachFormValues {
  return {
    occurredAt: toDatetimeLocalValue(),
    channel: presetChannel,
    result: 'sin_respuesta',
    notes: '',
  }
}

export function outreachTitle(channel: ContactActivityType): string {
  return `Intento de contacto · ${activityTypeLabel(channel)}`
}

export function formatOutreachLastContactLabel(
  occurredAt: string,
  channel: ContactActivityType,
  result: ContactOutreachResult,
): string {
  const whenPart = formatActivityWhenLabel(occurredAt).split('·')[0]?.trim()
    ?? formatActivityWhenLabel(occurredAt)
  return `${whenPart} · ${activityTypeLabel(channel)} · ${outreachResultLabel(result)}`
}

export function resolveReachabilityStatus(
  result: ContactOutreachResult,
  previous?: ContactReachabilityStatus,
): ContactReachabilityStatus {
  if (result === 'datos_invalidos') return 'invalid'
  if (result === 'contactado' || result === 'reagendar') return 'ok'
  return previous === 'invalid' ? 'invalid' : 'unknown'
}

export function resolveOutreachFilterStatus(
  contact: Pick<
    ContactListItem,
    | 'lastOutreachResult'
    | 'outreachAttemptCount'
    | 'lastContactLabel'
    | 'reachabilityStatus'
  >,
): ContactOutreachFilterStatus {
  if (contact.lastOutreachResult) {
    return contact.lastOutreachResult
  }
  if (contact.outreachAttemptCount && contact.outreachAttemptCount > 0) {
    return 'contactado'
  }
  if (contact.reachabilityStatus === 'invalid') {
    return 'datos_invalidos'
  }
  const label = contact.lastContactLabel?.trim().toLowerCase() ?? ''
  if (label && label !== 'recién creado') {
    return 'contactado'
  }
  return 'sin_contactar'
}

export function outreachBadgeVariant(
  status: ContactOutreachFilterStatus,
): 'customer' | 'prospect' | 'negotiation' | 'destructive' | 'muted' {
  switch (status) {
    case 'contactado':
      return 'customer'
    case 'sin_respuesta':
      return 'negotiation'
    case 'reagendar':
      return 'prospect'
    case 'datos_invalidos':
      return 'destructive'
    case 'sin_contactar':
    default:
      return 'muted'
  }
}

export function buildOutreachActivityDescription(
  result: ContactOutreachResult,
  notes: string,
): string {
  const header = `Resultado: ${outreachResultLabel(result)}`
  const body = notes.trim()
  return body ? `${header}\n\n${body}` : header
}

export function outreachFormToCreateValues(
  contact: Pick<ContactListItem, 'id' | 'name' | 'company'>,
  form: ContactOutreachFormValues,
  author: string,
): CreateActivityFormValues {
  return {
    title: outreachTitle(form.channel),
    type: form.channel,
    relatedType: 'contacto',
    relatedId: contact.id,
    relatedName: contact.name,
    companyName: contact.company?.trim() || contact.name,
    scheduledAt: form.occurredAt,
    durationMinutes: String(defaultDurationFieldForType(form.channel)),
    assigneeName: author.trim() || getCurrentUserName(),
    priority: 'Media',
    status: 'Completada',
    reminderPreset: 'none',
    reminderCustomAt: toDatetimeLocalValue(),
    description: buildOutreachActivityDescription(form.result, form.notes),
    outreachResult: form.result,
    interactionKind: 'outreach',
  }
}

export function applyOutreachToContact(
  contact: ContactListItem,
  form: ContactOutreachFormValues,
): ContactListItem {
  const attemptCount = (contact.outreachAttemptCount ?? 0) + 1
  const reachabilityStatus = resolveReachabilityStatus(
    form.result,
    contact.reachabilityStatus,
  )
  const lastOutreachLabel = formatOutreachLastContactLabel(
    form.occurredAt,
    form.channel,
    form.result,
  )

  return {
    ...contact,
    lastOutreachAt: form.occurredAt,
    lastOutreachChannel: form.channel,
    lastOutreachResult: form.result,
    reachabilityStatus,
    outreachAttemptCount: attemptCount,
    lastContactLabel: lastOutreachLabel,
    lastOutreachLabel,
  }
}

export function outreachActivityFromListItem(
  item: ActivityListItem,
  description?: string,
): ContactActivity {
  const base = listItemToContactActivity(item)
  return {
    ...base,
    description: description?.trim() || base.description,
    outreachResult: item.outreachResult,
    interactionKind: item.interactionKind ?? (item.outreachResult ? 'outreach' : undefined),
  }
}

export function validateOutreachForm(values: ContactOutreachFormValues): string | null {
  if (!values.occurredAt.trim()) return 'Indica cuándo ocurrió el intento de contacto.'
  const parsed = new Date(values.occurredAt)
  if (Number.isNaN(parsed.getTime())) return 'La fecha del contacto no es válida.'
  return null
}
