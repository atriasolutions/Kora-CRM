import { formatRutDisplay } from '@/lib/company-location'
import {
  formatRutOnBlur,
  getRutBodyNumber,
  getRutValidationMessage,
  normalizeRutInput,
  RUT_COMPANY_MIN_BODY,
} from '@/lib/contact-rut'

export type TaxIdentifierType = 'RUT' | 'DNI'

export const COMPANY_TAX_IDENTIFIER_TYPE_OPTIONS: {
  value: TaxIdentifierType
  label: string
}[] = [
  { value: 'RUT', label: 'RUT (empresa)' },
  { value: 'DNI', label: 'DNI' },
]

export const CONTACT_TAX_IDENTIFIER_TYPE_OPTIONS: {
  value: TaxIdentifierType
  label: string
}[] = [
  { value: 'RUT', label: 'RUT (persona)' },
  { value: 'DNI', label: 'DNI' },
]

/** @deprecated Usar COMPANY_TAX_IDENTIFIER_TYPE_OPTIONS */
export const TAX_IDENTIFIER_TYPE_OPTIONS = COMPANY_TAX_IDENTIFIER_TYPE_OPTIONS

type TaxIdValidationOptions = {
  required?: boolean
}

export function getDniValidationMessage(
  value: string,
  { required = true }: TaxIdValidationOptions = {},
): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return required ? 'El DNI es obligatorio.' : null
  }
  if (trimmed.length < 5) {
    return 'El DNI debe tener al menos 5 caracteres.'
  }
  if (trimmed.length > 20) {
    return 'El DNI no puede superar 20 caracteres.'
  }
  if (!/^[A-Za-z0-9.\-\s]+$/.test(trimmed)) {
    return 'El DNI solo puede contener letras y números.'
  }
  return null
}

export function getCompanyTaxIdValidationMessage(
  type: TaxIdentifierType,
  value: string,
  options?: TaxIdValidationOptions,
): string | null {
  if (type === 'RUT') {
    return getRutValidationMessage(value, { ...options, range: 'company' })
  }
  return getDniValidationMessage(value, options)
}

export function getContactTaxIdValidationMessage(
  type: TaxIdentifierType,
  value: string,
  options?: TaxIdValidationOptions,
): string | null {
  if (type === 'RUT') {
    return getRutValidationMessage(value, { ...options, range: 'person' })
  }
  return getDniValidationMessage(value, options)
}

export function inferContactIdentifierType(value: string): TaxIdentifierType {
  const trimmed = value.trim()
  if (!trimmed) return 'RUT'

  const clean = normalizeRutInput(trimmed)
  if (clean.length >= 2 && /^\d+[0-9K]$/.test(clean)) {
    const body = getRutBodyNumber(trimmed)
    if (body !== null && body < RUT_COMPANY_MIN_BODY) return 'RUT'
    if (
      getRutValidationMessage(trimmed, { required: false, range: 'person' }) === null
    ) {
      return 'RUT'
    }
  }

  if (/[A-Za-z]/.test(trimmed.replace(/[.\-\s]/g, ''))) return 'DNI'
  return 'RUT'
}

export function inferCompanyIdentifierType(value: string): TaxIdentifierType {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '—') return 'RUT'

  const clean = normalizeRutInput(trimmed)
  if (clean.length >= 2 && /^\d+[0-9K]$/.test(clean)) {
    const body = getRutBodyNumber(trimmed)
    if (body !== null && body >= RUT_COMPANY_MIN_BODY) return 'RUT'
    if (
      getRutValidationMessage(trimmed, { required: false, range: 'company' }) === null
    ) {
      return 'RUT'
    }
  }

  if (/[A-Za-z]/.test(trimmed.replace(/[.\-\s]/g, ''))) return 'DNI'
  return 'RUT'
}

export function formatTaxIdentifierDisplay(
  type: TaxIdentifierType,
  value: string,
): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '—') return '—'
  if (type === 'RUT') return formatRutDisplay(trimmed)
  return trimmed.toUpperCase()
}

export function normalizeTaxIdValue(
  type: TaxIdentifierType,
  value: string,
): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (type === 'RUT') return formatRutOnBlur(trimmed)
  return trimmed.replace(/\s+/g, ' ').toUpperCase()
}

/** @deprecated Usar normalizeTaxIdValue */
export function normalizeCompanyTaxIdValue(
  type: TaxIdentifierType,
  value: string,
): string {
  return normalizeTaxIdValue(type, value)
}

export function taxIdentifierLabel(type: TaxIdentifierType): string {
  return type === 'RUT' ? 'RUT' : 'DNI'
}
