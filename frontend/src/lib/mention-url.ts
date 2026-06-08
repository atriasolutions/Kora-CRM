import type { MentionKind } from '@/lib/mentions'

/** Segmento de ruta → tipo de registro (sin depender del host). */
const ROUTE_SLUG_TO_KIND: Record<string, MentionKind> = {
  contactos: 'contact',
  empresas: 'company',
  oportunidades: 'opportunity',
  cotizaciones: 'quote',
  proyectos: 'project',
  productos: 'product',
  facturacion: 'invoice',
  actividades: 'activity',
  solicitudes: 'solicitud',
}

export type ParsedCrmRecordPath = {
  kind: MentionKind
  recordId: string
}

/**
 * Extrae tipo e id desde una ruta interna (`/contactos/contactos-0`).
 * Ignora query, hash y host (localhost, producción, etc.).
 */
export function parseCrmRecordPath(pathname: string): ParsedCrmRecordPath | null {
  const pathOnly = pathname.split('?')[0]?.split('#')[0] ?? ''
  const normalized = pathOnly.replace(/\/+$/, '') || '/'
  const match = normalized.match(/^\/([^/]+)\/([^/]+)$/)
  if (!match) return null

  const slug = match[1]!.toLowerCase()
  const kind = ROUTE_SLUG_TO_KIND[slug]
  if (!kind) return null

  const recordId = decodeURIComponent(match[2]!)
  if (!recordId) return null

  return { kind, recordId }
}

function tryParseAsUrl(input: string): ParsedCrmRecordPath | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  try {
    const href = trimmed.startsWith('//')
      ? `https:${trimmed}`
      : trimmed.startsWith('www.')
        ? `https://${trimmed}`
        : trimmed

    if (!/^https?:\/\//i.test(href) && !href.startsWith('//')) {
      return null
    }

    const url = new URL(href)
    return parseCrmRecordPath(url.pathname)
  } catch {
    return null
  }
}

/**
 * Acepta URL absoluta (cualquier dominio) o ruta relativa del CRM.
 */
export function parseCrmRecordUrl(input: string): ParsedCrmRecordPath | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('/')) {
    return parseCrmRecordPath(trimmed)
  }

  return tryParseAsUrl(trimmed) ?? null
}

/** Quita `@` inicial si el usuario pegó `@https://...`. */
export function normalizeMentionUrlQuery(query: string): string {
  const trimmed = query.trim()
  if (trimmed.startsWith('@') && /[@/]|https?:/i.test(trimmed.slice(1))) {
    return trimmed.slice(1).trim()
  }
  return trimmed
}

export function looksLikeCrmRecordUrl(input: string): boolean {
  const q = normalizeMentionUrlQuery(input)
  if (!q) return false
  return (
    /^https?:\/\//i.test(q) ||
    q.startsWith('//') ||
    q.startsWith('www.') ||
    /^\/[a-z]/i.test(q)
  )
}
