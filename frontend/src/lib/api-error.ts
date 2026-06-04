import { CONNECTION_MESSAGE } from '@/lib/connection-messages'

/** Extrae el mensaje legible de errores HTTP del backend Express. */
export function parseApiErrorMessage(
  err: unknown,
  fallback = 'No se pudo completar la operación.',
): string {
  if (!(err instanceof Error)) return fallback
  const raw = err.message.trim()
  if (!raw) return fallback

  if (/failed to fetch|networkerror|load failed|network request failed/i.test(raw)) {
    return CONNECTION_MESSAGE
  }

  const jsonStart = raw.indexOf('{')
  if (jsonStart >= 0) {
    try {
      const body = JSON.parse(raw.slice(jsonStart)) as {
        error?: { message?: string }
        message?: string
      }
      const fromError = body.error?.message?.trim()
      if (fromError) return fromError
      const direct = body.message?.trim()
      if (direct) return direct
    } catch {
      /* ignore */
    }
  }

  const quoted = raw.match(/"message":"([^"]+)"/)
  if (quoted?.[1]) return quoted[1]

  if (/^HTTP \d+/.test(raw)) return fallback
  return raw
}
