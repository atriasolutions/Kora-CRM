/** Utilidades de formato para campos de formulario (CLP, %, enteros). */

export function parseAmountCLP(value: string): number {
  if (/medida/i.test(value)) return 0
  return Number.parseInt(value.replace(/[^\d]/g, ''), 10) || 0
}

export function formatAmountCLP(amount: number, options?: { allowEmpty?: boolean }): string {
  if (amount <= 0) return options?.allowEmpty ? '' : '$0'
  return `$${amount.toLocaleString('es-CL')}`
}

/** Normaliza entrada de monto a texto CLP con separador de miles (punto). */
export function formatAmountCLPFromInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return ''
  return formatAmountCLP(Number.parseInt(digits, 10))
}

export function parsePercent(value: string): number {
  return Math.min(100, Math.max(0, Number.parseInt(value.replace(/[^\d]/g, ''), 10) || 0))
}

export function formatPercent(value: number): string {
  return `${value}%`
}

export function formatPercentFromInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return ''
  return formatPercent(Math.min(100, Number.parseInt(digits, 10)))
}

export function parseInteger(value: string): number {
  return Number.parseInt(value.replace(/[^\d]/g, ''), 10) || 0
}

export function formatInteger(value: number): string {
  if (value <= 0) return ''
  return String(value)
}

export function formatIntegerFromInput(raw: string): string {
  return raw.replace(/[^\d]/g, '')
}

/** Entero con signo opcional (ajustes +/- de stock). */
export function formatSignedIntegerFromInput(raw: string): string {
  const trimmed = raw.trim()
  const negative = trimmed.startsWith('-')
  const digits = trimmed.replace(/[^\d]/g, '')
  if (!digits) return negative ? '-' : ''
  return negative ? `-${digits}` : digits
}

export function parseSignedInteger(value: string): number {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '-') return Number.NaN
  const n = Number.parseInt(trimmed, 10)
  return Number.isFinite(n) ? n : Number.NaN
}

/**
 * Texto alfanumérico: letras con tildes, marcas combinantes (IME / teclas muertas),
 * números y puntuación habitual en español (Chile).
 */
export function sanitizeAlphanumeric(value: string): string {
  return value.replace(
    /[^\p{L}\p{M}\p{N}\s@.,#+\-_/()%$&*:;!?¡¿'"«»°ºª\u00B0\u2013\u2014]/gu,
    '',
  )
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Dígitos nacionales chilenos (sin +56 ni cero inicial). */
export function normalizeChilePhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (digits.startsWith('56')) digits = digits.slice(2)
  return digits
}

/** Móvil 9XXXXXXXX o fijo chileno de 9 dígitos (código de área incluido). */
export function isValidChilePhone(value: string): boolean {
  const digits = normalizeChilePhoneDigits(value.trim())
  if (digits.length !== 9) return false
  if (digits.startsWith('9')) return true
  return /^[2-7]/.test(digits)
}

/** Caracteres permitidos mientras se escribe un teléfono. */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^\d+\s().-]/g, '')
}

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  return EMAIL_PATTERN.test(trimmed)
}

export function isValidPhone(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '—') return false
  return isValidChilePhone(trimmed)
}

export function getEmailValidationError(
  value: string,
  options?: { required?: boolean },
): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return options?.required ? 'El email es obligatorio.' : null
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return 'Introduce un email válido (ej. nombre@empresa.com).'
  }
  return null
}

export function getPhoneValidationError(
  value: string,
  options?: { required?: boolean },
): string | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '—') {
    return options?.required ? 'El teléfono es obligatorio.' : null
  }
  if (!isValidChilePhone(trimmed)) {
    return 'Introduce un teléfono chileno válido (ej. +56 9 8765 4321).'
  }
  return null
}
