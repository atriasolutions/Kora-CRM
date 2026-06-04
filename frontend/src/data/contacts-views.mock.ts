import type { ContactLifecycleStatus, ContactListItem } from '@/data/contacts.mock'
import type { ContactFilters } from '@/lib/contact-filters'
import { matchesContactFilters } from '@/lib/contact-filters'
import { resolveOutreachFilterStatus } from '@/lib/contact-outreach'

/** Conjunto para tablero y segmentos (solo datos del registry). */
export function getContactsBoardDataset(): ContactListItem[] {
  return []
}

export function filterContactsByQuery(
  contacts: ContactListItem[],
  query: string,
): ContactListItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return contacts
  return contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.role.toLowerCase().includes(q),
  )
}

export function filterContacts(
  contacts: ContactListItem[],
  query: string,
  filters?: ContactFilters,
): ContactListItem[] {
  let result = filterContactsByQuery(contacts, query)
  if (filters) {
    result = result.filter((c) => matchesContactFilters(c, filters))
  }
  return result
}

export const KANBAN_COLUMNS: {
  status: ContactLifecycleStatus
  description: string
}[] = [
  { status: 'Prospecto', description: 'En seguimiento' },
  { status: 'Cliente', description: 'Cuentas activas' },
  { status: 'Proveedor', description: 'Socios y suministro' },
]

export type ContactSegmentDef = {
  id: string
  name: string
  description: string
  /** Clase de acento en borde lateral */
  accentClass: string
  matches: (contact: ContactListItem) => boolean
}

export const contactSegments: ContactSegmentDef[] = [
  {
    id: 'clientes-activos',
    name: 'Clientes activos',
    description: 'Contactos en etapa Cliente con actividad reciente.',
    accentClass: 'border-emerald-500',
    matches: (c) => c.status === 'Cliente',
  },
  {
    id: 'prospectos-latam',
    name: 'Prospectos LATAM',
    description: 'Prospectos en Argentina, Chile, Colombia y México.',
    accentClass: 'border-sky-500',
    matches: (c) =>
      c.status === 'Prospecto' &&
      /\+54|\+56|\+57|\+52|argentina|chile|colombia|méxico|mexico/i.test(
        `${c.company} ${c.phone}`,
      ),
  },
  {
    id: 'prospectos-nuevos',
    name: 'Prospectos recientes',
    description: 'Contactos en etapa Prospecto.',
    accentClass: 'border-violet-500',
    matches: (c) => c.status === 'Prospecto',
  },
  {
    id: 'prospectos-sin-contactar',
    name: 'Prospectos sin contactar',
    description: 'Prospectos sin ningún intento de contacto registrado.',
    accentClass: 'border-rose-500',
    matches: (c) =>
      c.status === 'Prospecto' &&
      resolveOutreachFilterStatus(c) === 'sin_contactar',
  },
  {
    id: 'sin-seguimiento',
    name: 'Sin seguimiento reciente',
    description: 'Último contacto hace más de 7 días.',
    accentClass: 'border-amber-500',
    matches: (c) =>
      !c.lastContactLabel.toLowerCase().includes('hoy') &&
      !c.lastContactLabel.toLowerCase().includes('ayer'),
  },
  {
    id: 'decisores',
    name: 'Decisores C-level',
    description: 'CEO, CTO, CFO y cargos directivos.',
    accentClass: 'border-orange-500',
    matches: (c) =>
      /\b(ceo|cto|cfo|coo|chief|founder|director|head of)\b/i.test(c.role),
  },
  {
    id: 'enterprise',
    name: 'Cuentas enterprise',
    description: 'Empresas de industria o logística de mayor tamaño.',
    accentClass: 'border-primary',
    matches: (c) =>
      /industrial|logistics|logística|fintech|agro/i.test(c.company),
  },
]

export function countSegmentMatches(
  contacts: ContactListItem[],
  segment: ContactSegmentDef,
): number {
  return contacts.filter(segment.matches).length
}
