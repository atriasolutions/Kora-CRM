import { resolveActivityListItem } from '@/data/activity-detail.mock'
import { resolveCompanyListItem } from '@/data/company-detail.mock'
import { resolveContactListItem } from '@/data/contact-detail.mock'
import { resolveInvoiceListItem } from '@/data/invoice-detail.mock'
import { resolveOpportunityListItem } from '@/data/opportunity-detail.mock'
import { resolveProductListItem } from '@/data/product-detail.mock'
import { resolveProjectListItem } from '@/data/project-detail.mock'
import { resolveQuoteListItem } from '@/data/quote-detail.mock'
import { resolveSolicitudListItem } from '@/data/solicitudes.mock'
import { isApiEnabled } from '@/api/config'
import { searchMentionsApi } from '@/api/mentions'
import { registerUserInDisplayCache } from '@/lib/user-display-cache'
import { resolveUserNameFromCache } from '@/lib/user-display-cache'
import { getCurrentUserName } from '@/lib/current-user'
import {
  looksLikeCrmRecordUrl,
  normalizeMentionUrlQuery,
  parseCrmRecordUrl,
} from '@/lib/mention-url'
import { activityListSeed } from '@/data/activities.mock'
import { companyListSeed } from '@/data/companies.mock'
import { contactListSeed } from '@/data/contacts.mock'
import { invoiceListSeed } from '@/data/invoices.mock'
import { opportunityListSeed } from '@/data/opportunities.mock'
import { productListSeed } from '@/data/products.mock'
import { projectListSeed } from '@/data/projects.mock'
import { quoteListSeed } from '@/data/quotes.mock'
import { solicitudListSeed } from '@/data/solicitudes.mock'

export type MentionKind =
  | 'user'
  | 'contact'
  | 'company'
  | 'opportunity'
  | 'quote'
  | 'project'
  | 'product'
  | 'invoice'
  | 'activity'
  | 'solicitud'

export type MentionItem = {
  /** Identificador compuesto: `kind:recordId` */
  id: string
  kind: MentionKind
  recordId: string
  label: string
  subtitle?: string
  /** Ruta interna; vacío para usuarios sin ficha */
  href: string
}

export type NoteMention = {
  id: string
  kind: MentionKind
  recordId: string
  label: string
  href: string
}

export const MENTION_KIND_LABELS: Record<MentionKind, string> = {
  user: 'Usuarios',
  contact: 'Contactos',
  company: 'Empresas',
  opportunity: 'Oportunidades',
  quote: 'Cotizaciones',
  project: 'Proyectos',
  product: 'Productos',
  invoice: 'Facturas',
  activity: 'Actividades',
  solicitud: 'Solicitudes',
}

const MENTION_KIND_ORDER: MentionKind[] = [
  'user',
  'contact',
  'company',
  'opportunity',
  'quote',
  'project',
  'product',
  'invoice',
  'activity',
  'solicitud',
]

function mentionUserId(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '-')
}

function compositeId(kind: MentionKind, recordId: string): string {
  return `${kind}:${recordId}`
}

export function mentionRecordHref(kind: MentionKind, recordId: string): string {
  switch (kind) {
    case 'contact':
      return `/contactos/${recordId}`
    case 'company':
      return `/empresas/${recordId}`
    case 'opportunity':
      return `/oportunidades/${recordId}`
    case 'quote':
      return `/cotizaciones/${recordId}`
    case 'project':
      return `/proyectos/${recordId}`
    case 'product':
      return `/productos/${recordId}`
    case 'invoice':
      return `/facturacion/${recordId}`
    case 'activity':
      return `/actividades/${recordId}`
    case 'solicitud':
      return `/solicitudes/${recordId}`
    default:
      return ''
  }
}

const useApi = isApiEnabled()

const apiMentionCache = new Map<string, MentionItem>()

/** Limpia caché de menciones al cambiar de tenant (evita datos stale cross-tenant). */
export function clearMentionApiCache(): void {
  apiMentionCache.clear()
}

function cacheMentionItems(items: MentionItem[]): void {
  for (const item of items) {
    apiMentionCache.set(item.id, item)
    if (item.kind === 'user') {
      registerUserInDisplayCache({
        id: item.recordId,
        name: item.label,
        email: item.subtitle,
      })
    }
  }
}

export async function filterMentionItemsAsync(
  query: string,
  limit = 12,
): Promise<MentionItem[]> {
  if (!useApi) return filterMentionItems(query, limit)
  try {
    const items = await searchMentionsApi(query, limit)
    cacheMentionItems(items)
    return items
  } catch {
    return filterMentionItems(query, limit)
  }
}

function buildUserMentions(): MentionItem[] {
  const names = new Set<string>([getCurrentUserName()])
  return [...names].map((label) => {
    const recordId = mentionUserId(label)
    return {
      id: compositeId('user', recordId),
      kind: 'user',
      recordId,
      label,
      href: '',
    }
  })
}

function buildRegistry(): MentionItem[] {
  const users = buildUserMentions()

  const contacts: MentionItem[] = contactListSeed.map((c) => ({
    id: compositeId('contact', c.id),
    kind: 'contact',
    recordId: c.id,
    label: c.name,
    subtitle: [c.role, c.company].filter(Boolean).join(' · '),
    href: mentionRecordHref('contact', c.id),
  }))

  const companies: MentionItem[] = companyListSeed.map((c) => ({
    id: compositeId('company', c.id),
    kind: 'company',
    recordId: c.id,
    label: c.name,
    subtitle: [c.industry, c.city].filter(Boolean).join(' · '),
    href: mentionRecordHref('company', c.id),
  }))

  const opportunities: MentionItem[] = opportunityListSeed.map((o) => ({
    id: compositeId('opportunity', o.id),
    kind: 'opportunity',
    recordId: o.id,
    label: o.name,
    subtitle: [o.company, o.amount].filter(Boolean).join(' · '),
    href: mentionRecordHref('opportunity', o.id),
  }))

  const quotes: MentionItem[] = quoteListSeed.map((q) => ({
    id: compositeId('quote', q.id),
    kind: 'quote',
    recordId: q.id,
    label: q.code,
    subtitle: [q.title, q.companyName].filter(Boolean).join(' · '),
    href: mentionRecordHref('quote', q.id),
  }))

  const projects: MentionItem[] = projectListSeed.map((p) => ({
    id: compositeId('project', p.id),
    kind: 'project',
    recordId: p.id,
    label: p.name,
    subtitle: [p.client, p.manager].filter(Boolean).join(' · '),
    href: mentionRecordHref('project', p.id),
  }))

  const products: MentionItem[] = productListSeed.map((p) => ({
    id: compositeId('product', p.id),
    kind: 'product',
    recordId: p.id,
    label: p.name,
    subtitle: [p.sku, p.category].filter(Boolean).join(' · '),
    href: mentionRecordHref('product', p.id),
  }))

  const invoices: MentionItem[] = invoiceListSeed.map((inv) => ({
    id: compositeId('invoice', inv.id),
    kind: 'invoice',
    recordId: inv.id,
    label: inv.number,
    subtitle: [inv.client, inv.amount].filter(Boolean).join(' · '),
    href: mentionRecordHref('invoice', inv.id),
  }))

  const activities: MentionItem[] = activityListSeed.map((a) => ({
    id: compositeId('activity', a.id),
    kind: 'activity',
    recordId: a.id,
    label: a.title,
    subtitle: [a.typeLabel, a.relatedName].filter(Boolean).join(' · '),
    href: mentionRecordHref('activity', a.id),
  }))

  const solicitudes: MentionItem[] = solicitudListSeed.map((s) => ({
    id: compositeId('solicitud', s.id),
    kind: 'solicitud',
    recordId: s.id,
    label: s.code,
    subtitle: [s.title, s.status].filter(Boolean).join(' · '),
    href: mentionRecordHref('solicitud', s.id),
  }))

  return [
    ...users,
    ...contacts,
    ...companies,
    ...opportunities,
    ...quotes,
    ...projects,
    ...products,
    ...invoices,
    ...activities,
    ...solicitudes,
  ]
}

const MENTION_REGISTRY: MentionItem[] = useApi ? [] : buildRegistry()
const MENTION_BY_ID = new Map(
  useApi ? [] : MENTION_REGISTRY.map((m) => [m.id, m] as const),
)
const MENTION_BY_HREF = new Map(
  useApi
    ? []
    : MENTION_REGISTRY.filter((m) => m.href).map((m) => [m.href, m] as const),
)

function lookupMentionByRecord(
  kind: MentionKind,
  recordId: string,
): MentionItem | null {
  const id = compositeId(kind, recordId)
  const cached = MENTION_BY_ID.get(id) ?? MENTION_BY_HREF.get(mentionRecordHref(kind, recordId))
  if (cached) return { ...cached, recordId, href: mentionRecordHref(kind, recordId) }

  if (useApi) return null

  if (kind === 'user') return null

  try {
    switch (kind) {
      case 'contact': {
        const c = resolveContactListItem(recordId)
        return {
          id,
          kind,
          recordId,
          label: c.name,
          subtitle: [c.role, c.company].filter(Boolean).join(' · '),
          href: mentionRecordHref(kind, recordId),
        }
      }
      case 'company': {
        const c = resolveCompanyListItem(recordId)
        return {
          id,
          kind,
          recordId,
          label: c.name,
          subtitle: [c.industry, c.city].filter(Boolean).join(' · '),
          href: mentionRecordHref(kind, recordId),
        }
      }
      case 'opportunity': {
        const o = resolveOpportunityListItem(recordId)
        return {
          id,
          kind,
          recordId,
          label: o.name,
          subtitle: [o.company, o.amount].filter(Boolean).join(' · '),
          href: mentionRecordHref(kind, recordId),
        }
      }
      case 'quote': {
        const q = resolveQuoteListItem(recordId)
        return {
          id,
          kind,
          recordId,
          label: q.code,
          subtitle: [q.title, q.companyName].filter(Boolean).join(' · '),
          href: mentionRecordHref(kind, recordId),
        }
      }
      case 'project': {
        const p = resolveProjectListItem(recordId)
        return {
          id,
          kind,
          recordId,
          label: p.name,
          subtitle: [p.client, p.manager].filter(Boolean).join(' · '),
          href: mentionRecordHref(kind, recordId),
        }
      }
      case 'product': {
        const p = resolveProductListItem(recordId)
        return {
          id,
          kind,
          recordId,
          label: p.name,
          subtitle: [p.sku, p.category].filter(Boolean).join(' · '),
          href: mentionRecordHref(kind, recordId),
        }
      }
      case 'invoice': {
        const inv = resolveInvoiceListItem(recordId)
        return {
          id,
          kind,
          recordId,
          label: inv.number,
          subtitle: [inv.client, inv.amount].filter(Boolean).join(' · '),
          href: mentionRecordHref(kind, recordId),
        }
      }
      case 'activity': {
        const a = resolveActivityListItem(recordId)
        return {
          id,
          kind,
          recordId,
          label: a.title,
          subtitle: [a.typeLabel, a.relatedName].filter(Boolean).join(' · '),
          href: mentionRecordHref(kind, recordId),
        }
      }
      case 'solicitud': {
        const s = resolveSolicitudListItem(recordId)
        return {
          id,
          kind,
          recordId,
          label: s.code,
          subtitle: [s.title, s.status].filter(Boolean).join(' · '),
          href: mentionRecordHref(kind, recordId),
        }
      }
      default:
        return null
    }
  } catch {
    return null
  }
}

/** Resuelve una URL o ruta del CRM a una mención (independiente del dominio). */
export function resolveMentionFromUrl(input: string): MentionItem | null {
  const parsed = parseCrmRecordUrl(normalizeMentionUrlQuery(input))
  if (!parsed || parsed.kind === 'user') return null
  return lookupMentionByRecord(parsed.kind, parsed.recordId)
}

export function getMentionById(id: string): MentionItem | undefined {
  const normalized = normalizeLegacyMentionId(id)
  if (useApi) {
    return apiMentionCache.get(normalized)
  }
  return MENTION_BY_ID.get(normalized)
}

/** Compatibilidad con notas antiguas (`maria-lopez` sin prefijo). */
function normalizeLegacyMentionId(id: string): string {
  if (id.includes(':')) return id
  return compositeId('user', id)
}

function mentionSearchText(item: MentionItem): string {
  return [item.label, item.subtitle ?? '', MENTION_KIND_LABELS[item.kind]]
    .join(' ')
    .toLowerCase()
}

export function filterMentionItems(query: string, limit = 12): MentionItem[] {
  if (useApi) {
    return [...apiMentionCache.values()]
      .filter((item) =>
        mentionSearchText(item).includes(query.trim().toLowerCase()),
      )
      .slice(0, limit)
  }

  if (looksLikeCrmRecordUrl(query)) {
    const fromUrl = resolveMentionFromUrl(query)
    if (fromUrl) return [fromUrl]
  }

  const q = query.trim().toLowerCase()
  if (!q) {
    const perKind = 2
    const picked: MentionItem[] = []
    for (const kind of MENTION_KIND_ORDER) {
      picked.push(
        ...MENTION_REGISTRY.filter((m) => m.kind === kind).slice(0, perKind),
      )
    }
    return picked.slice(0, limit)
  }

  return MENTION_REGISTRY.filter((item) => mentionSearchText(item).includes(q))
    .sort((a, b) => {
      const aLabel = a.label.toLowerCase()
      const bLabel = b.label.toLowerCase()
      const aStarts = aLabel.startsWith(q) ? 0 : 1
      const bStarts = bLabel.startsWith(q) ? 0 : 1
      if (aStarts !== bStarts) return aStarts - bStarts
      return aLabel.localeCompare(bLabel, 'es')
    })
    .slice(0, limit)
}

export function groupMentionItems(items: MentionItem[]): Map<MentionKind, MentionItem[]> {
  const groups = new Map<MentionKind, MentionItem[]>()
  for (const kind of MENTION_KIND_ORDER) {
    const slice = items.filter((m) => m.kind === kind)
    if (slice.length > 0) groups.set(kind, slice)
  }
  return groups
}

export function parseMentionId(id: string): { kind: MentionKind; recordId: string } {
  const normalized = normalizeLegacyMentionId(id)
  const sep = normalized.indexOf(':')
  if (sep === -1) return { kind: 'user', recordId: normalized }
  const kind = normalized.slice(0, sep) as MentionKind
  const recordId = normalized.slice(sep + 1)
  return { kind, recordId }
}

export function resolveMentionLabel(id: string): string {
  const normalized = normalizeLegacyMentionId(id)
  const cached = getMentionById(normalized)
  if (cached?.label) return cached.label

  const { kind, recordId } = parseMentionId(normalized)
  if (kind === 'user' && useApi) {
    const fromUserCache = resolveUserNameFromCache(recordId)
    if (fromUserCache !== recordId) return fromUserCache
  }

  return recordId
}

export function extractMentionsFromHtml(html: string): NoteMention[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const nodes = doc.querySelectorAll('[data-type="mention"]')
  const seen = new Set<string>()
  const mentions: NoteMention[] = []

  nodes.forEach((node) => {
    const rawId = node.getAttribute('data-id')
    if (!rawId || seen.has(rawId)) return
    seen.add(rawId)

    const normalized = normalizeLegacyMentionId(rawId)
    const kindAttr = node.getAttribute('data-mention-kind') as MentionKind | null
    const label = node.getAttribute('data-label') ?? resolveMentionLabel(normalized)
    const hrefAttr = node.getAttribute('data-href') ?? ''
    const { kind, recordId } = kindAttr
      ? { kind: kindAttr, recordId: parseMentionId(normalized).recordId }
      : parseMentionId(normalized)

    const registry = getMentionById(normalized)
    mentions.push({
      id: normalized,
      kind: registry?.kind ?? kind,
      recordId: registry?.recordId ?? recordId,
      label: registry?.label ?? label,
      href: hrefAttr || registry?.href || mentionRecordHref(kind, recordId),
    })
  })

  return mentions
}

/** @deprecated Usar extractMentionsFromHtml */
export function extractMentionIdsFromHtml(html: string): string[] {
  return extractMentionsFromHtml(html).map((m) => m.id)
}

export function isNoteContentEmpty(html: string): boolean {
  const text = html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return text.length === 0
}
