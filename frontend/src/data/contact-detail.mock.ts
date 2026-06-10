import type {
  ActivityPriority,
  ActivityRelatedType,
  ActivityStatus,
} from '@/data/activities.mock'
import { getAllKnownCompanies } from '@/data/companies-registry-store'
import { getRegistryContactById } from '@/data/contacts-registry-store'
import type { ContactLifecycleStatus, ContactListItem } from '@/data/contacts.mock'
import { contactListSeed } from '@/data/contacts.mock'
import { opportunityListSeed } from '@/data/opportunities.mock'
import type { OpportunityQuoteSummary } from '@/lib/quote-relations'
import { findCompanyById } from '@/lib/company-lookup'
import { buildContactActivitiesForDetail } from '@/lib/contact-activities'
import { opportunitiesForContact } from '@/lib/contact-opportunities'
import { formatContactLocation } from '@/lib/contact-create'
import { getContactFiles, type ContactFile } from '@/lib/contact-files'
import {
  applyContactListOverride,
  loadContactDetailOverride,
  mergeDetailOverride,
} from '@/lib/contact-detail-storage'
import { mergeContactListAvatar } from '@/lib/entity-list-image-cache'
import { mergeOutreachIntoContact } from '@/lib/contact-outreach-storage'
import { ensureRecordAudit } from '@/lib/seed-audit'
import type { NoteMention } from '@/lib/mentions'

export type ContactActivityType =
  | 'llamada'
  | 'email'
  | 'reunion'
  | 'nota'
  | 'whatsapp'

export type ContactActivity = {
  id: string
  /** Enlace al registro en /actividades/:id */
  recordId?: string
  type: ContactActivityType
  title: string
  description?: string
  /** Fecha/hora en que debe realizarse la actividad */
  when: string
  /** Fecha en que se registró la actividad */
  createdAt?: string
  author: string
  status?: ActivityStatus
  priority?: ActivityPriority
  /** Intento de contacto completado (registro de outreach). */
  interactionKind?: 'outreach' | 'scheduled'
  outreachResult?: import('@/lib/contact-outreach').ContactOutreachResult
  /** Registro CRM vinculado (contacto, empresa, oportunidad, etc.) */
  relatedType?: ActivityRelatedType
  relatedId?: string
  relatedName?: string
  companyName?: string
}

export type { NoteMention } from '@/lib/mentions'

export type ContactNote = {
  id: string
  /** Contenido HTML sanitizado (negritas, listas, menciones @). */
  body: string
  mentions?: NoteMention[]
  author: string
  authorUserId?: string | null
  when: string
}

export type ContactOpportunity = {
  id: string
  name: string
  stage: string
  amount: string
  closeDate: string
  probability?: string
  /** Usado en ficha de empresa; no se muestra en contacto. */
  quotes?: OpportunityQuoteSummary[]
}

export type ContactDetail = ContactListItem & {
  location: string
  timezone: string
  linkedIn?: string
  source: string
  owner: { name: string; avatarUrl?: string }
  companyDetail: {
    name: string
    industry: string
    website: string
    employees: string
  }
  score: number
  pipelineValue: string
  pendingActivities: number
  nextActivity?: { title: string; when: string }
  tags: string[]
  activities: ContactActivity[]
  notes: ContactNote[]
  opportunities: ContactOpportunity[]
  files: ContactFile[]
}

export function resolveContactListItem(
  id: string,
  base?: ContactListItem,
): ContactListItem {
  const fromRegistry = getRegistryContactById(id)
  const source = fromRegistry ?? base
  if (!source) {
    throw new Error(`Contacto no encontrado: ${id}`)
  }
  const merged = applyContactListOverride({ ...source, id }, loadContactDetailOverride(id))
  return mergeContactListAvatar(mergeOutreachIntoContact(ensureRecordAudit(merged, merged.ownerName ?? '—')))
}

/** Responsable interno del contacto (lista, override o rotación demo). */
export function resolveContactOwnerName(
  id: string,
  base?: ContactListItem,
): string {
  const row = base ?? resolveContactListItem(id)
  if (row.ownerName?.trim()) return row.ownerName.trim()
  const override = loadContactDetailOverride(id)
  if (override?.owner?.name?.trim()) return override.owner.name.trim()
  const idx = seedIndexFromId(id, row)
  return owners[idx % owners.length]!.name
}

const owners = [
  { name: 'María López' },
  { name: 'Carlos Vega' },
  { name: 'Ana Ruiz' },
]

const industries = [
  'Software B2B',
  'Retail',
  'Manufactura',
  'E-commerce',
  'Fintech',
  'Logística',
  'Salud',
]

function seedIndexFromId(id: string, contact: ContactListItem): number {
  const pageMatch =
    /^contactos-(\d+)$/.exec(id) ?? /^contact-(\d+)$/.exec(id)
  if (pageMatch) return Number.parseInt(pageMatch[1] ?? '0', 10)
  const idx = contactListSeed.findIndex(
    (s) => s.name === contact.name && s.email === contact.email,
  )
  return idx >= 0 ? idx : 0
}

function statusScore(status: ContactLifecycleStatus): number {
  switch (status) {
    case 'Cliente':
      return 88
    case 'Prospecto':
      return 72
    case 'Proveedor':
      return 65
    default:
      return 72
  }
}

export function getContactDetail(id: string): ContactDetail {
  const base = resolveContactListItem(id)
  const idx = seedIndexFromId(id, base)
  const owner = base.ownerName
    ? { name: base.ownerName }
    : owners[idx % owners.length]!
  const storedLocation = formatContactLocation(base)
  const linkedCompany = base.companyId
    ? findCompanyById(getAllKnownCompanies(), base.companyId)
    : undefined
  const industry = linkedCompany?.industry ?? industries[idx % industries.length]!

  const pipelineValues = [
    '$55,400',
    '$18,200',
    '$128,900',
    '$32,650',
    '$9,800',
    '$42,000',
    '$67,500',
    '$210,000',
  ]

  const locations = [
    'Buenos Aires, AR',
    'Bogotá, CO',
    'Ciudad de México, MX',
    'Santiago, CL',
    'Madrid, ES',
    'Lima, PE',
  ]

  const built: ContactDetail = {
    ...base,
    id,
    location: storedLocation ?? locations[idx % locations.length]!,
    timezone: 'GMT-3',
    linkedIn:
      base.linkedIn ??
      `linkedin.com/in/${base.name.toLowerCase().replace(/\s+/g, '-')}`,
    source: base.source ?? (idx % 2 === 0 ? 'Formulario web' : 'Referido'),
    owner,
    companyDetail: {
      name: linkedCompany?.name ?? base.company,
      industry,
      website: linkedCompany
        ? `${linkedCompany.name.toLowerCase().replace(/\s+/g, '')}.com`
        : `${base.company.toLowerCase().replace(/\s+/g, '')}.com`,
      employees: linkedCompany?.employees ?? `${(idx + 3) * 45}`,
    },
    score: statusScore(base.status) + (idx % 7),
    pipelineValue: pipelineValues[idx % pipelineValues.length]!,
    pendingActivities: (idx % 3) + 1,
    nextActivity:
      idx % 4 !== 0
        ? {
            title: 'Enviar seguimiento post-demo',
            when: 'Mañana, 11:00',
          }
        : undefined,
    tags: [
      base.status === 'Cliente' ? 'Cuenta clave' : 'Nutrición activa',
      'LATAM',
      idx % 2 === 0 ? 'Enterprise' : 'Mid-market',
    ],
    activities: buildContactActivitiesForDetail({ ...base, id }),
    notes: [
      ...(base.initialNote
        ? [
            {
              id: `note-${id}-0`,
              body: base.initialNote,
              author: owner.name,
              when: 'Al crear registro',
            },
          ]
        : []),
      {
        id: `note-${id}-1`,
        body: '<p>Prefiere comunicación por <strong>email</strong> los martes y jueves por la mañana. Seguimiento con <span data-type="mention" data-id="user:maria-lopez" data-label="María López" data-mention-kind="user" class="mention mention-user">@María López</span> y revisar cotización <span data-type="mention" data-id="quote:qt1" data-label="COT-2024-0142" data-mention-kind="quote" data-href="/cotizaciones/qt1" class="mention mention-record">COT-2024-0142</span>.</p>',
        mentions: [
          {
            id: 'user:maria-lopez',
            kind: 'user',
            recordId: 'maria-lopez',
            label: 'María López',
            href: '',
          },
          {
            id: 'quote:qt1',
            kind: 'quote',
            recordId: 'qt1',
            label: 'COT-2024-0142',
            href: '/cotizaciones/qt1',
          },
        ],
        author: owner.name,
        when: '14 may, 09:00',
      },
      {
        id: `note-${id}-2`,
        body: 'Decisor final para contratos mayores a USD 50k; involucrar a CFO en negociación.',
        author: 'Carlos Vega',
        when: '5 may, 16:30',
      },
    ],
    opportunities: opportunitiesForContact(opportunityListSeed, {
      name: base.name,
      company: base.company,
      companyId: base.companyId,
    }).map((opp) => ({
      id: opp.id,
      name: opp.name,
      stage: opp.stage,
      amount: opp.amount,
      closeDate: opp.closeDate,
      probability: opp.probability,
    })),
    files: getContactFiles(id, owner.name),
  }
  const detail = mergeDetailOverride(built, loadContactDetailOverride(id))
  return ensureRecordAudit(detail, owner.name)
}
