import { STORAGE_PREFIX } from '@/config/brand'

const MAX_ENTRIES = 40

export type EntityRecentSlug =
  | 'contactos'
  | 'empresas'
  | 'oportunidades'
  | 'cotizaciones'
  | 'facturacion'
  | 'actividades'
  | 'proyectos'
  | 'compras'
  | 'ingresos'
  | 'inventario'
  | 'productos'
  | 'usuarios'

type RecentEntry = { id: string; viewedAt: number }

/** Módulos CRM conectados a API: solo memoria de sesión. */
const SESSION_ONLY_SLUGS = new Set<EntityRecentSlug>([
  'contactos',
  'empresas',
  'oportunidades',
  'cotizaciones',
])

const sessionRecent = new Map<EntityRecentSlug, RecentEntry[]>()

function storageKey(slug: EntityRecentSlug): string {
  return `${STORAGE_PREFIX}-crm-recent-${slug}`
}

function readEntries(slug: EntityRecentSlug): RecentEntry[] {
  if (SESSION_ONLY_SLUGS.has(slug)) {
    return sessionRecent.get(slug) ?? []
  }
  try {
    const raw = localStorage.getItem(storageKey(slug))
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is RecentEntry =>
        Boolean(e) &&
        typeof e.id === 'string' &&
        typeof e.viewedAt === 'number',
    )
  } catch {
    return []
  }
}

function writeEntries(slug: EntityRecentSlug, entries: RecentEntry[]) {
  if (SESSION_ONLY_SLUGS.has(slug)) {
    sessionRecent.set(slug, entries)
    return
  }
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(entries))
  } catch {
    /* quota */
  }
}

export function recordEntityView(slug: EntityRecentSlug, entityId: string) {
  const id = entityId.trim()
  if (!id) return
  const now = Date.now()
  const next = [
    { id, viewedAt: now },
    ...readEntries(slug).filter((e) => e.id !== id),
  ].slice(0, MAX_ENTRIES)
  writeEntries(slug, next)
}

export function loadRecentlyViewedIds(slug: EntityRecentSlug): string[] {
  return readEntries(slug)
    .sort((a, b) => b.viewedAt - a.viewedAt)
    .map((e) => e.id)
}

export function removeEntityFromRecentlyViewed(slug: EntityRecentSlug, entityId: string) {
  const id = entityId.trim()
  if (!id) return
  writeEntries(
    slug,
    readEntries(slug).filter((e) => e.id !== id),
  )
}
