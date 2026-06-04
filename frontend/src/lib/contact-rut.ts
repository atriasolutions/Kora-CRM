import { formatRutDisplay } from '@/lib/company-location'

/** Umbral SII: personas naturales < 50.000.000; empresas >= 50.000.000. */
export const RUT_COMPANY_MIN_BODY = 50_000_000

export type RutRange = 'person' | 'company'

/** Limpia y deja solo cuerpo + dígito verificador en mayúsculas. */
export function normalizeRutInput(rut: string): string {
  return rut.replace(/[^\dkK]/gi, '').toUpperCase()
}

/** Permite solo caracteres válidos mientras el usuario escribe. */
export function sanitizeRutTyping(value: string): string {
  return value.replace(/[^\d.\-\sKk]/g, '').replace(/\s+/g, '')
}

export function validateChileanRut(rut: string): boolean {
  return getRutValidationMessage(rut, { required: true }) === null
}

type RutValidationOptions = {
  required?: boolean
  /** `person`: RUT < 50.000.000 · `company`: RUT >= 50.000.000 */
  range?: RutRange
}

export function getRutBodyNumber(rut: string): number | null {
  const clean = normalizeRutInput(rut)
  if (clean.length < 2) return null
  const body = clean.slice(0, -1)
  if (!/^\d+$/.test(body)) return null
  return Number.parseInt(body, 10)
}

/**
 * Devuelve mensaje de error o `null` si el RUT es válido.
 * Valida formato, longitud y dígito verificador (módulo 11).
 */
export function getRutValidationMessage(
  rut: string,
  { required = true, range }: RutValidationOptions = {},
): string | null {
  const trimmed = rut.trim()
  if (!trimmed) {
    return required ? 'El RUT es obligatorio.' : null
  }

  const clean = normalizeRutInput(trimmed)
  if (clean.length < 2) {
    return 'Ingresa el RUT completo, incluyendo el dígito verificador.'
  }

  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)

  if (!/^\d+$/.test(body)) {
    return 'El RUT solo debe contener números antes del dígito verificador.'
  }

  if (body.length < 7) {
    return 'El RUT debe tener al menos 7 dígitos antes del verificador.'
  }

  if (body.length > 8) {
    return 'El RUT no puede tener más de 8 dígitos antes del verificador.'
  }

  let sum = 0
  let multiplier = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number.parseInt(body[i]!, 10) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const remainder = 11 - (sum % 11)
  const expected =
    remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder)

  if (dv !== expected) {
    return 'RUT inválido.'
  }

  if (range === 'person') {
    const bodyNum = getRutBodyNumber(trimmed)
    if (bodyNum !== null && bodyNum >= RUT_COMPANY_MIN_BODY) {
      return 'El RUT de persona debe ser inferior a 50.000.000.'
    }
  }

  if (range === 'company') {
    const bodyNum = getRutBodyNumber(trimmed)
    if (bodyNum !== null && bodyNum < RUT_COMPANY_MIN_BODY) {
      return 'El RUT de empresa debe ser 50.000.000 o superior.'
    }
  }

  return null
}

export function formatRutOnBlur(rut: string): string {
  const clean = normalizeRutInput(rut)
  if (clean.length < 2) return rut.trim()
  return formatRutDisplay(clean)
}
