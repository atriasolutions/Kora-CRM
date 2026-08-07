import type { ContactLifecycleStatus, ContactListItem } from '@/data/contacts.mock'
import { CONTACT_STATUS_OPTIONS } from '@/lib/contact-form'
import {
  resolveOutreachFilterStatus,
  type ContactOutreachFilterStatus,
} from '@/lib/contact-outreach'
import {
  createDefaultListDateFilter,
  isListDateFilterActive,
  listDateFilterToServerQuery,
  listRowMatchesDateFilter,
  type ListDateFilter,
} from '@/lib/list-date-filter'

export type ContactLastContactFilter = 'all' | 'today' | 'week' | 'stale'

export type ContactOutreachFilter = ContactOutreachFilterStatus | 'all'

export type ContactFilters = {
  statuses: ContactLifecycleStatus[]
  lastContact: ContactLastContactFilter
  outreach: ContactOutreachFilter
  date: ListDateFilter
}

export const CONTACT_LAST_CONTACT_OPTIONS: {
  value: ContactLastContactFilter
  label: string
}[] = [
  { value: 'all', label: 'Cualquier fecha' },
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Hoy o ayer' },
  { value: 'stale', label: 'Sin seguimiento reciente' },
]

export const CONTACT_OUTREACH_FILTER_OPTIONS: {
  value: ContactOutreachFilter
  label: string
}[] = [
  { value: 'all', label: 'Todos' },
  { value: 'sin_contactar', label: 'Sin contactar' },
  { value: 'contactado', label: 'Contactados' },
  { value: 'sin_respuesta', label: 'Sin respuesta' },
  { value: 'reagendar', label: 'Reagendar' },
  { value: 'datos_invalidos', label: 'Datos inválidos' },
]

export function createDefaultContactFilters(): ContactFilters {
  return {
    statuses: [],
    lastContact: 'all',
    outreach: 'all',
    date: createDefaultListDateFilter(),
  }
}

export function countActiveContactFilters(filters: ContactFilters): number {
  let n = 0
  if (filters.statuses.length > 0) n += 1
  if (filters.lastContact !== 'all') n += 1
  if (filters.outreach !== 'all') n += 1
  if (isListDateFilterActive(filters.date)) n += 1
  return n
}

function matchesLastContact(
  label: string | undefined,
  filter: ContactLastContactFilter,
): boolean {
  if (!label) return filter !== 'today' && filter !== 'week'
  const v = label.toLowerCase()
  switch (filter) {
    case 'today':
      return v.includes('hoy')
    case 'week':
      return v.includes('hoy') || v.includes('ayer')
    case 'stale':
      return !v.includes('hoy') && !v.includes('ayer')
    case 'all':
    default:
      return true
  }
}

function matchesOutreach(
  contact: ContactListItem,
  filter: ContactOutreachFilter,
): boolean {
  if (filter === 'all') return true
  return resolveOutreachFilterStatus(contact) === filter
}

export function contactRowMatchesFilters(
  row: ContactListItem,
  filters: ContactFilters,
): boolean {
  return matchesContactFilters(row, filters)
}

export function matchesContactFilters(
  contact: ContactListItem,
  filters: ContactFilters,
): boolean {
  if (
    filters.statuses.length > 0 &&
    !filters.statuses.includes(contact.status)
  ) {
    return false
  }
  if (!matchesLastContact(contact.lastContactLabel, filters.lastContact)) {
    return false
  }
  if (!matchesOutreach(contact, filters.outreach)) {
    return false
  }
  if (!listRowMatchesDateFilter(contact.createdAt, filters.date)) return false
  return true
}

export function contactFiltersToServerQuery(
  filters: ContactFilters,
  options?: { mine?: boolean; ownerName?: string },
): Record<string, string> {
  const query: Record<string, string> = {
    ...listDateFilterToServerQuery(filters.date),
  }
  if (filters.statuses.length > 0) {
    query.status = filters.statuses.join(',')
  }
  if (filters.lastContact !== 'all') {
    query.lastContact = filters.lastContact
  }
  if (filters.outreach !== 'all') {
    query.outreach = filters.outreach
  }
  if (options?.mine && options.ownerName?.trim()) {
    query.ownerName = options.ownerName.trim()
  }
  return query
}

export function toggleContactStatus(
  filters: ContactFilters,
  status: ContactLifecycleStatus,
): ContactFilters {
  const has = filters.statuses.includes(status)
  return {
    ...filters,
    statuses: has
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status],
  }
}

export { CONTACT_STATUS_OPTIONS }
export type { ContactOutreachFilterStatus }
