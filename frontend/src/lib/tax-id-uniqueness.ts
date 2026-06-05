import type { CompanyListItem } from '@/data/companies.mock'
import { getAllKnownCompanies } from '@/data/companies-registry-store'
import type { ContactListItem } from '@/data/contacts.mock'
import { getRegistryContacts } from '@/data/contacts-registry-store'
import { normalizeRutInput } from '@/lib/contact-rut'
import {
  inferCompanyIdentifierType,
  inferContactIdentifierType,
  normalizeTaxIdValue,
  type TaxIdentifierType,
} from '@/lib/tax-identifier'

type TaxIdRecord = {
  id: string
  name: string
  rut?: string
  email?: string
}

export function normalizeDniKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase()
}

export function normalizeContactRutKey(value: string): string {
  return normalizeRutInput(value)
}

export function normalizeCompanyTaxIdKey(
  type: TaxIdentifierType,
  value: string,
): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (type === 'RUT') return normalizeContactRutKey(trimmed)
  return normalizeDniKey(trimmed)
}

export function normalizeContactTaxIdKey(
  type: TaxIdentifierType,
  value: string,
): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (type === 'RUT') return normalizeContactRutKey(trimmed)
  return normalizeDniKey(trimmed)
}

function contactTaxIdKeysMatch(
  type: TaxIdentifierType,
  value: string,
  otherRut: string,
): boolean {
  const otherType = inferContactIdentifierType(otherRut)
  if (type !== otherType) return false
  const keyA = normalizeContactTaxIdKey(type, value)
  const keyB = normalizeContactTaxIdKey(otherType, otherRut)
  return Boolean(keyA && keyB && keyA === keyB)
}

function companyTaxIdKeysMatch(
  type: TaxIdentifierType,
  value: string,
  otherRut: string,
): boolean {
  const otherType = inferCompanyIdentifierType(otherRut)
  if (type !== otherType) return false
  const keyA = normalizeCompanyTaxIdKey(type, value)
  const keyB = normalizeCompanyTaxIdKey(otherType, otherRut)
  return Boolean(keyA && keyB && keyA === keyB)
}

export function findDuplicateContactByTaxId(
  type: TaxIdentifierType,
  rut: string,
  excludeId?: string,
  candidates: TaxIdRecord[] = getRegistryContacts(),
): TaxIdRecord | null {
  const trimmed = rut.trim()
  if (!trimmed) return null
  return (
    candidates.find(
      (row) =>
        row.id !== excludeId &&
        row.rut?.trim() &&
        contactTaxIdKeysMatch(type, trimmed, row.rut),
    ) ?? null
  )
}

export function findDuplicateCompanyByTaxId(
  type: TaxIdentifierType,
  rut: string,
  excludeId?: string,
  candidates: CompanyListItem[] = getAllKnownCompanies(),
): CompanyListItem | null {
  const trimmed = rut.trim()
  if (!trimmed) return null
  return (
    candidates.find(
      (row) =>
        row.id !== excludeId &&
        row.rut?.trim() &&
        row.rut !== '—' &&
        companyTaxIdKeysMatch(type, trimmed, row.rut),
    ) ?? null
  )
}

export function getDuplicateContactTaxIdMessage(
  type: TaxIdentifierType,
  rut: string,
  excludeId?: string,
  candidates?: ContactListItem[],
): string | null {
  const duplicate = findDuplicateContactByTaxId(type, rut, excludeId, candidates)
  if (!duplicate) return null
  const label = type === 'RUT' ? 'RUT' : 'DNI'
  return `Ya existe un contacto con ese ${label}: «${duplicate.name}».`
}

export function normalizeContactEmailKey(value: string): string {
  return value.trim().toLowerCase()
}

export function findDuplicateContactByEmail(
  email: string,
  excludeId?: string,
  candidates: TaxIdRecord[] = getRegistryContacts(),
): TaxIdRecord | null {
  const key = normalizeContactEmailKey(email)
  if (!key) return null
  return (
    candidates.find(
      (row) =>
        row.id !== excludeId &&
        row.email?.trim() &&
        normalizeContactEmailKey(row.email) === key,
    ) ?? null
  )
}

export function getDuplicateContactEmailMessage(
  email: string,
  excludeId?: string,
  candidates?: ContactListItem[],
): string | null {
  const duplicate = findDuplicateContactByEmail(email, excludeId, candidates)
  if (!duplicate) return null
  return `Ya existe un contacto con ese correo: «${duplicate.name}».`
}

export function getDuplicateCompanyTaxIdMessage(
  type: TaxIdentifierType,
  rut: string,
  excludeId?: string,
  candidates?: CompanyListItem[],
): string | null {
  const duplicate = findDuplicateCompanyByTaxId(type, rut, excludeId, candidates)
  if (!duplicate) return null
  const label = type === 'RUT' ? 'RUT' : 'DNI'
  return `Ya existe una empresa con ese ${label}: «${duplicate.name}».`
}

/** Normaliza el identificador antes de persistir y detectar duplicados en importaciones. */
export function normalizeContactTaxIdForStorage(
  type: TaxIdentifierType,
  rut: string,
): string {
  return normalizeTaxIdValue(type, rut)
}

export function normalizeCompanyTaxIdForStorage(
  type: TaxIdentifierType,
  rut: string,
): string {
  return normalizeTaxIdValue(type, rut)
}
