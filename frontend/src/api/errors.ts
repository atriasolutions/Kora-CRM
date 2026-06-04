/** Error cuando no hay conexión con el backend o el servidor no responde. */
export class ApiConnectionError extends Error {
  readonly status = 0

  constructor(
    message = 'No se pudo conectar con el servidor. Intente nuevamente en unos minutos.',
  ) {
    super(message)
    this.name = 'ApiConnectionError'
  }
}

/** Error HTTP del backend (incluye código de estado). */
export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

/** Error cuando el backend responde 404 (registro eliminado o inexistente). */
export class RecordNotFoundError extends Error {
  readonly status = 404

  constructor(message = 'Registro no encontrado') {
    super(message)
    this.name = 'RecordNotFoundError'
  }
}

export function isRecordNotFoundError(error: unknown): error is RecordNotFoundError {
  if (error instanceof RecordNotFoundError) return true
  if (error instanceof HttpError && error.status === 404) return true
  if (error instanceof Error && error.message.toLowerCase().includes('http 404')) return true
  return false
}

export function isConnectionError(error: unknown): error is ApiConnectionError {
  if (error instanceof ApiConnectionError) return true
  if (error instanceof TypeError) return true
  if (error instanceof HttpError) {
    return error.status === 502 || error.status === 503 || error.status === 504
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('network request failed') ||
      msg.includes('load failed') ||
      msg.includes('fetch failed')
    )
  }
  return false
}

export type RecordUnavailableReasonKind =
  | 'not_found'
  | 'forbidden'
  | 'archived'
  | 'invalid_id'
  | 'connection_error'

/** Clasifica un error de carga de detalle para la UI unificada. */
export function resolveRecordUnavailableReason(
  error: unknown,
): RecordUnavailableReasonKind {
  if (isForbiddenError(error)) return 'forbidden'
  if (isRecordNotFoundError(error)) return 'not_found'
  if (isConnectionError(error)) return 'connection_error'
  return 'connection_error'
}

/** Error cuando el backend responde 403 (sin permiso). */
export class ForbiddenError extends Error {
  readonly status = 403

  constructor(message = 'No tienes permiso para esta acción') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export function isForbiddenError(error: unknown): error is ForbiddenError {
  if (error instanceof ForbiddenError) return true
  if (error instanceof HttpError && error.status === 403) return true
  if (error instanceof Error && error.message.toLowerCase().includes('http 403')) return true
  return false
}

/** Mensaje listo para toast cuando falla una acción de API. */
export function apiActionErrorMessage(
  error: unknown,
  fallback = 'No se pudo completar la acción.',
): string {
  if (isConnectionError(error)) {
    return 'No se pudo conectar con el servidor. Intente nuevamente en unos minutos.'
  }
  if (isForbiddenError(error)) {
    return (
      forbiddenErrorMessage(error) ??
      'No tienes permiso para realizar esta acción.'
    )
  }
  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.trim()
    if (!msg.toLowerCase().startsWith('http ')) return msg
  }
  return fallback
}

export function forbiddenErrorMessage(error: unknown): string | undefined {
  if (error instanceof ForbiddenError || error instanceof HttpError) {
    const msg = error.message.trim()
    if (msg && !msg.toLowerCase().startsWith('http ')) return msg
  }
  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.trim()
    if (!msg.toLowerCase().startsWith('http ')) return msg
  }
  return undefined
}
