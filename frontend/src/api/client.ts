import { loadAuthSession } from '@/lib/auth-session'
import {
  ApiConnectionError,
  ForbiddenError,
  HttpError,
  RecordNotFoundError,
} from '@/api/errors'

/**
 * Punto único para llamadas HTTP al backend Express.
 *
 * Prefiere `import.meta.env.VITE_API_URL` (p.ej. `http://localhost:4000`).
 * En desarrollo se puede usar en su lugar `vite.config.ts` → `server.proxy('/api')`
 * y construir rutas relativas tipo `/api/...`.
 */
export function apiBaseURL(): string {
  const raw = import.meta.env.VITE_API_URL
  return typeof raw === 'string' && raw.length > 0 ? raw.replace(/\/$/, '') : ''
}

export type FetchJSONInit = RequestInit & {
  /** Si es false, no adjunta token de sesión (endpoints públicos). Default: true. */
  auth?: boolean
}

export async function fetchJSON<T>(
  path: string,
  init?: FetchJSONInit,
): Promise<T> {
  const { auth = true, ...requestInit } = init ?? {}
  const base = apiBaseURL()
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const session = auth ? loadAuthSession() : null
  const authHeaders: Record<string, string> = {}
  if (session?.token) {
    authHeaders.Authorization = `Bearer ${session.token}`
    authHeaders['x-auth-token'] = session.token
  }

  let res: Response
  try {
    res = await fetch(url, {
      credentials: auth ? 'include' : 'omit',
      ...requestInit,
      headers: {
        Accept: 'application/json',
        ...authHeaders,
        ...requestInit.headers,
      },
    })
  } catch {
    throw new ApiConnectionError()
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let message = `HTTP ${res.status}`
    if (text) {
      try {
        const body = JSON.parse(text) as { error?: { message?: string } }
        if (body.error?.message?.trim()) {
          message = body.error.message.trim()
        } else {
          message = `${message}: ${text.slice(0, 280)}`
        }
      } catch {
        message = `${message}: ${text.slice(0, 280)}`
      }
    }
    if (res.status === 404) {
      throw new RecordNotFoundError(message)
    }
    if (res.status === 403) {
      throw new ForbiddenError(message)
    }
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new ApiConnectionError()
    }
    throw new HttpError(res.status, message)
  }

  // 204 / cuerpo vacío: no intentar JSON.parse (falla en DELETE y similares).
  if (res.status === 204) {
    return undefined as T
  }
  const bodyText = await res.text()
  if (!bodyText.trim()) {
    return undefined as T
  }
  try {
    return JSON.parse(bodyText) as T
  } catch {
    throw new Error('La respuesta del servidor no es JSON válido.')
  }
}
