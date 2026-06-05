import type { ContactDetail } from '@/data/contact-detail.mock'
import type { ContactLifecycleStatus, ContactListItem } from '@/data/contacts.mock'
import { getAllKnownCompanies } from '@/data/companies-registry-store'
import { formatContactListSubtitle } from '@/lib/contact-form'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import {
  findCompanyById,
  findCompanyByName,
  resolveCompanyIdFromName,
} from '@/lib/company-lookup'
import type { TaxIdentifierType } from '@/lib/tax-identifier'
import {
  getContactTaxIdValidationMessage,
  inferContactIdentifierType,
  normalizeTaxIdValue,
} from '@/lib/tax-identifier'
import {
  getDuplicateContactEmailMessage,
  getDuplicateContactTaxIdMessage,
} from '@/lib/tax-id-uniqueness'
import { stampRecordAuditOnCreate } from '@/lib/record-audit'

export type CreateContactFormValues = {
  name: string
  avatarUrl: string
  identifierType?: TaxIdentifierType
  rut: string
  email: string
  phone: string
  mobilePhone: string
  companyId: string
  /** Nombre denormalizado (CSV / vista previa). */
  company: string
  role: string
  streetAddress: string
  region: string
  commune: string
  linkedIn: string
  source: string
  initialNote: string
  status: ContactLifecycleStatus
  ownerName: string
}

export function createDefaultContactFormValues(
  partial?: Partial<CreateContactFormValues>,
): CreateContactFormValues {
  return {
    name: '',
    avatarUrl: '',
    rut: '',
    email: '',
    phone: '',
    mobilePhone: '',
    companyId: '',
    company: '',
    role: '',
    streetAddress: '',
    region: '',
    commune: '',
    linkedIn: '',
    source: '',
    initialNote: '',
    status: 'Prospecto',
    ownerName: getDefaultOwnerName(),
    ...partial,
    identifierType:
      partial?.identifierType ??
      inferContactIdentifierType(partial?.rut ?? ''),
  }
}

export function duplicateContactDetailFormValues(
  contact: ContactDetail,
): CreateContactFormValues {
  return duplicateContactFormValues(
    stampRecordAuditOnCreate({
    id: contact.id,
    name: contact.name,
    subtitle: contact.subtitle,
    avatarUrl: contact.avatarUrl,
    companyId: contact.companyId,
    company: contact.company,
    email: contact.email,
    phone: contact.phone,
    role: contact.role,
    status: contact.status,
    lastContactLabel: contact.lastContactLabel,
    rut: contact.rut,
    mobilePhone: contact.mobilePhone,
    streetAddress: contact.streetAddress,
    region: contact.region,
    commune: contact.commune,
    city: contact.city,
    linkedIn: contact.linkedIn,
    source: contact.source,
    ownerName: contact.owner.name,
    initialNote: contact.initialNote,
  }),
  )
}

export function duplicateContactFormValues(
  source: ContactListItem,
): CreateContactFormValues {
  const copySuffix = ' (copia)'
  const baseEmail = source.email.replace(/ \(copia\)\d*$/i, '')
  const emailParts = baseEmail.split('@')
  const duplicatedEmail =
    emailParts.length === 2
      ? `${emailParts[0]}+copia@${emailParts[1]}`
      : `${baseEmail}.copia`

  return {
    name: `${source.name.replace(/ \(copia\)$/i, '')}${copySuffix}`,
    avatarUrl: source.avatarUrl,
    identifierType: inferContactIdentifierType(source.rut ?? ''),
    rut: source.rut ?? '',
    email: duplicatedEmail,
    phone: '',
    mobilePhone:
      source.mobilePhone?.trim() ||
      (source.phone && source.phone !== '—' ? source.phone : ''),
    companyId: source.companyId ?? '',
    company: source.company,
    role: source.role,
    streetAddress: source.streetAddress ?? '',
    region: source.region ?? '',
    commune: source.commune ?? source.city ?? '',
    linkedIn: source.linkedIn ?? '',
    source: source.source ?? '',
    initialNote: '',
    status: source.status,
    ownerName: getDefaultOwnerName(),
  }
}

export function validateCreateContactForm(
  values: CreateContactFormValues,
  options?: { excludeId?: string },
): string | null {
  if (!values.name.trim()) return 'El nombre es obligatorio.'
  const identifierType =
    values.identifierType ?? inferContactIdentifierType(values.rut)
  const taxIdError = getContactTaxIdValidationMessage(
    identifierType,
    values.rut,
    { required: false },
  )
  if (taxIdError) return taxIdError
  if (values.rut.trim()) {
    const duplicateTaxIdError = getDuplicateContactTaxIdMessage(
      identifierType,
      values.rut,
      options?.excludeId,
    )
    if (duplicateTaxIdError) return duplicateTaxIdError
  }
  if (!values.email.trim()) return 'El email es obligatorio.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    return 'Introduce un email válido.'
  }
  const duplicateEmailError = getDuplicateContactEmailMessage(
    values.email,
    options?.excludeId,
  )
  if (duplicateEmailError) return duplicateEmailError
  if (!values.mobilePhone.trim()) return 'El móvil / WhatsApp es obligatorio.'
  return null
}

export function enrichContactFormWithCompany(
  values: CreateContactFormValues,
): CreateContactFormValues {
  const companies = getAllKnownCompanies()
  if (values.companyId.trim()) {
    const linked = findCompanyById(companies, values.companyId)
    return linked ? { ...values, company: linked.name } : values
  }
  const name = values.company.trim()
  if (!name) return values
  const id = resolveCompanyIdFromName(companies, name)
  const linked = id ? findCompanyById(companies, id) : findCompanyByName(companies, name)
  return {
    ...values,
    companyId: id,
    company: linked?.name ?? name,
  }
}

export function enrichContactFormsFromCsv(
  rows: CreateContactFormValues[],
): CreateContactFormValues[] {
  return rows.map((row) => enrichContactFormWithCompany(row))
}

export function createContactId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function trimOptional(value: string): string | undefined {
  const v = value.trim()
  return v || undefined
}

export function formValuesToListItem(
  values: CreateContactFormValues,
  id = createContactId(),
): ContactListItem {
  const enriched = enrichContactFormWithCompany(values)
  const companies = getAllKnownCompanies()
  const linked = findCompanyById(companies, enriched.companyId)
  const name = enriched.name.trim()
  const company = linked?.name ?? enriched.company.trim()
  const role = enriched.role.trim() || 'Sin cargo'
  return stampRecordAuditOnCreate({
    id,
    name,
    subtitle: formatContactListSubtitle(role, company),
    avatarUrl: enriched.avatarUrl.trim(),
    companyId: enriched.companyId.trim() || undefined,
    company,
    email: enriched.email.trim(),
    phone: enriched.mobilePhone.trim() || '—',
    role,
    status: enriched.status,
    lastContactLabel: 'Recién creado',
    rut: normalizeTaxIdValue(
      enriched.identifierType ?? inferContactIdentifierType(enriched.rut),
      enriched.rut,
    ),
    mobilePhone: trimOptional(enriched.mobilePhone),
    streetAddress: trimOptional(enriched.streetAddress),
    region: trimOptional(enriched.region),
    commune: trimOptional(enriched.commune),
    linkedIn: trimOptional(enriched.linkedIn),
    source: trimOptional(enriched.source),
    initialNote: trimOptional(enriched.initialNote),
    ownerName: enriched.ownerName.trim() || undefined,
  })
}

export function formatContactLocation(
  item: Pick<ContactListItem, 'streetAddress' | 'commune' | 'region' | 'city'>,
): string | undefined {
  const commune = item.commune?.trim() || item.city?.trim()
  const parts = [item.streetAddress?.trim(), commune, item.region?.trim()].filter(Boolean)
  return parts.length ? parts.join(', ') : undefined
}

const CSV_HEADERS: Record<string, keyof CreateContactFormValues> = {
  nombre: 'name',
  name: 'name',
  rut: 'rut',
  dni: 'rut',
  tipoidentificador: 'identifierType',
  identifiertype: 'identifierType',
  tipo_identificador: 'identifierType',
  email: 'email',
  correo: 'email',
  telefono: 'mobilePhone',
  teléfono: 'mobilePhone',
  phone: 'mobilePhone',
  movil: 'mobilePhone',
  móvil: 'mobilePhone',
  mobile: 'mobilePhone',
  empresa: 'company',
  company: 'company',
  cargo: 'role',
  role: 'role',
  direccion: 'streetAddress',
  dirección: 'streetAddress',
  address: 'streetAddress',
  region: 'region',
  región: 'region',
  comuna: 'commune',
  commune: 'commune',
  ciudad: 'commune',
  city: 'commune',
  linkedin: 'linkedIn',
  origen: 'source',
  source: 'source',
  estado: 'status',
  status: 'status',
}

import { normalizeContactStatus } from '@/lib/contact-form'

function normalizeStatus(raw: string): ContactLifecycleStatus {
  return normalizeContactStatus(raw)
}

export type CsvParseResult = {
  rows: CreateContactFormValues[]
  errors: string[]
  skipped: number
}

export function parseContactsCsv(text: string): CsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { rows: [], errors: ['El archivo está vacío.'], skipped: 0 }
  }

  const delimiter = lines[0]!.includes(';') ? ';' : ','
  const headerCells = lines[0]!
    .split(delimiter)
    .map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''))

  const columnMap = headerCells.map((h) => CSV_HEADERS[h] ?? null)
  const hasKnownHeader = columnMap.some(Boolean)
  const dataLines = hasKnownHeader ? lines.slice(1) : lines

  if (dataLines.length === 0) {
    return { rows: [], errors: ['No hay filas de datos para importar.'], skipped: 0 }
  }

  const rows: CreateContactFormValues[] = []
  const errors: string[] = []
  let skipped = 0

  const normalizeIdentifierType = (raw: string): TaxIdentifierType => {
    const v = raw.trim().toLowerCase()
    if (v === 'dni') return 'DNI'
    return 'RUT'
  }

  dataLines.forEach((line, index) => {
    const cells = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''))

    let values: CreateContactFormValues
    if (hasKnownHeader) {
      values = createDefaultContactFormValues()
      columnMap.forEach((field, colIdx) => {
        if (!field) return
        const cell = cells[colIdx] ?? ''
        if (field === 'status') {
          values.status = normalizeStatus(cell)
        } else if (field === 'companyId') {
          values.companyId = cell
        } else if (field === 'identifierType') {
          values.identifierType = normalizeIdentifierType(cell)
        } else {
          values[field] = cell
        }
      })
    } else {
      values = createDefaultContactFormValues({
        name: cells[0] ?? '',
        rut: cells[1] ?? '',
        email: cells[2] ?? '',
        company: cells[3] ?? '',
        mobilePhone: cells[4] ?? '',
        role: cells[5] ?? '',
        status: normalizeStatus(cells[6] ?? 'Prospecto'),
      })
    }

    const enriched = enrichContactFormWithCompany(values)
    const rowError = validateCreateContactForm(enriched)
    if (rowError) {
      skipped += 1
      const hint =
        rowError.includes('empresa') && values.company.trim()
          ? ` (empresa «${values.company.trim()}» no encontrada en el catálogo)`
          : ''
      errors.push(`Fila ${index + (hasKnownHeader ? 2 : 1)}: ${rowError}${hint}`)
      return
    }
    rows.push(enriched)
  })

  return { rows, errors, skipped }
}
