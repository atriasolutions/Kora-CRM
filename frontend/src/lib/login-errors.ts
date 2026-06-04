import { HttpError } from '@/api/errors'
import { parseApiErrorMessage } from '@/lib/api-error'
import {
  CONNECTION_MESSAGE,
  CONNECTION_TITLE,
} from '@/lib/connection-messages'

export { CONNECTION_MESSAGE, CONNECTION_TITLE }

export function isLoginConnectionError(message: string | null | undefined): boolean {
  return message === CONNECTION_MESSAGE
}

const CREDENTIALS_FALLBACK = 'Correo o contraseña incorrectos.'

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const raw = err.message.toLowerCase()
  return (
    /failed to fetch|networkerror|load failed|network request failed|aborted/.test(
      raw,
    ) ||
    (err.name === 'TypeError' && raw.includes('fetch'))
  )
}

/** Proxy de Vite / caída del backend sin JSON de la API. */
function isUnreachableHttpMessage(message: string): boolean {
  const lower = message.toLowerCase()
  if (/^http (5\d\d|408|502|503|504)\b/.test(lower)) return true
  if (
    /econnrefused|enotfound|etimedout|socket hang up|bad gateway|service unavailable|gateway timeout|proxy error/.test(
      lower,
    )
  ) {
    return true
  }
  if (/respuesta del servidor no es json/i.test(lower)) return true
  if (/<!doctype html|<html[\s>]/i.test(message)) return true
  return false
}

function isServerSideFailure(status: number): boolean {
  return status >= 500 || status === 408 || status === 502 || status === 503 || status === 504
}

/** Mensaje de error para el formulario de login (red vs credenciales). */
export function parseLoginErrorMessage(
  err: unknown,
  fallback = CREDENTIALS_FALLBACK,
): string {
  if (isNetworkError(err)) return CONNECTION_MESSAGE

  if (err instanceof HttpError) {
    if (isServerSideFailure(err.status)) return CONNECTION_MESSAGE
    if (err.status === 400 && err.message && !/^HTTP \d+/.test(err.message)) {
      return err.message
    }
    if (err.status === 401 && err.message) return err.message
    if (isUnreachableHttpMessage(err.message)) return CONNECTION_MESSAGE
    return err.message || fallback
  }

  if (err instanceof Error) {
    if (isUnreachableHttpMessage(err.message)) return CONNECTION_MESSAGE
    const parsed = parseApiErrorMessage(err, '')
    if (parsed && !/^HTTP \d+/.test(parsed)) return parsed
    if (/^HTTP \d+/.test(err.message)) return CONNECTION_MESSAGE
  }

  return fallback
}

export { CREDENTIALS_FALLBACK }
