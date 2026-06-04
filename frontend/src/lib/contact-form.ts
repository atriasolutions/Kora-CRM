import type { ContactDetail } from '@/data/contact-detail.mock'
import { stampRecordAuditOnUpdate } from '@/lib/record-audit'
import type { ContactLifecycleStatus, ContactListItem } from '@/data/contacts.mock'
import { getAllKnownCompanies } from '@/data/companies-registry-store'
import { formatContactLocation } from '@/lib/contact-create'
import { findCompanyById } from '@/lib/company-lookup'
import type { ContactDetailOverride } from '@/lib/contact-detail-storage'
import type { TaxIdentifierType } from '@/lib/tax-identifier'
import {
  getContactTaxIdValidationMessage,
  inferContactIdentifierType,
  normalizeTaxIdValue,
} from '@/lib/tax-identifier'
import { getDuplicateContactTaxIdMessage } from '@/lib/tax-id-uniqueness'
import {
  getEmailValidationError,
  getPhoneValidationError,
} from '@/lib/form-input-format'
import { getDefaultOwnerName } from '@/lib/user-lookup'

export type ContactKind = 'B2B' | 'B2C'

export type ContactFormValues = {
  contactKind: ContactKind
  identifierType: TaxIdentifierType
  name: string
  rut: string
  avatarUrl: string
  status: ContactLifecycleStatus
  role: string
  companyId: string
  company: string
  streetAddress: string
  region: string
  commune: string
  location: string
  email: string
  phone: string
  mobilePhone: string
  linkedIn: string
  initialNote: string
  timezone: string
  source: string
  ownerName: string
  industry: string
  website: string
  employees: string
}

export const CONTACT_STATUS_OPTIONS: ContactLifecycleStatus[] = [
  'Prospecto',
  'Cliente',
  'Proveedor',
]

export const CONTACT_KIND_OPTIONS: { value: ContactKind; label: string }[] = [
  { value: 'B2B', label: 'B2B — persona en una empresa' },
  { value: 'B2C', label: 'B2C — persona / consumidor final' },
]

/** Compatibilidad con registros antiguos o CSV con «Lead». */
export function normalizeContactStatus(status: string): ContactLifecycleStatus {
  const v = status.trim().toLowerCase()
  if (v === 'lead') return 'Prospecto'
  if (v === 'cliente' || v === 'customer') return 'Cliente'
  if (v === 'prospecto' || v === 'prospect') return 'Prospecto'
  if (v === 'proveedor' || v === 'supplier' || v === 'vendor') return 'Proveedor'
  if (CONTACT_STATUS_OPTIONS.includes(status.trim() as ContactLifecycleStatus)) {
    return status.trim() as ContactLifecycleStatus
  }
  return 'Prospecto'
}

export function inferContactKind(
  input: Pick<ContactFormValues, 'contactKind' | 'companyId' | 'company'>,
): ContactKind {
  if (input.contactKind) return input.contactKind
  return input.companyId?.trim() || input.company?.trim() ? 'B2B' : 'B2C'
}

export function contactKindFromDetail(
  contact: Pick<ContactDetail, 'companyId' | 'company'>,
): ContactKind {
  return contact.companyId?.trim() || contact.company?.trim() ? 'B2B' : 'B2C'
}

export const CONTACT_SOURCE_OPTIONS = [
  'Formulario web',
  'Referido',
  'Evento / feria',
  'LinkedIn',
  'Llamada entrante',
  'Email frío',
  'Otro',
] as const

export function createToContactFormValues(
  partial?: Partial<ContactFormValues>,
): ContactFormValues {
  return {
    name: '',
    rut: '',
    avatarUrl: '',
    contactKind: 'B2C',
    status: 'Prospecto',
    role: '',
    companyId: '',
    company: '',
    streetAddress: '',
    region: '',
    commune: '',
    location: '',
    email: '',
    phone: '',
    mobilePhone: '',
    linkedIn: '',
    source: '',
    initialNote: '',
    ownerName: getDefaultOwnerName(),
    timezone: 'GMT-3',
    industry: '',
    website: '',
    employees: '',
    ...partial,
    identifierType:
      partial?.identifierType ??
      inferContactIdentifierType(partial?.rut ?? ''),
  }
}

/** Campos usados al crear/importar (sin metadata de ficha demo). */
export function contactFormValuesToCreate(values: ContactFormValues) {
  const kind = inferContactKind(values)
  return {
    name: values.name,
    avatarUrl: values.avatarUrl,
    rut: normalizeTaxIdValue(values.identifierType, values.rut),
    email: values.email,
    phone: values.mobilePhone,
    mobilePhone: values.mobilePhone,
    companyId: kind === 'B2B' ? values.companyId : '',
    company: kind === 'B2B' ? values.company : '',
    role: kind === 'B2B' ? values.role : '',
    streetAddress: values.streetAddress,
    region: values.region,
    commune: values.commune,
    linkedIn: values.linkedIn,
    source: values.source,
    initialNote: values.initialNote,
    status: normalizeContactStatus(values.status),
    ownerName: values.ownerName,
  }
}

export function contactDetailToFormValues(contact: ContactDetail): ContactFormValues {
  return {
    contactKind: contactKindFromDetail(contact),
    identifierType: inferContactIdentifierType(contact.rut ?? ''),
    name: contact.name,
    rut: contact.rut ?? '',
    avatarUrl: contact.avatarUrl,
    status: normalizeContactStatus(contact.status),
    role: contact.role,
    companyId: contact.companyId ?? '',
    company: contact.company,
    streetAddress: contact.streetAddress ?? '',
    region: contact.region ?? '',
    commune: contact.commune ?? contact.city ?? '',
    location: contact.location,
    email: contact.email,
    phone: '',
    mobilePhone:
      contact.mobilePhone?.trim() ||
      (contact.phone && contact.phone !== '—' ? contact.phone : ''),
    linkedIn: contact.linkedIn ?? '',
    initialNote: contact.initialNote ?? '',
    timezone: contact.timezone,
    source: contact.source,
    ownerName: contact.owner.name,
    industry: contact.companyDetail.industry,
    website: contact.companyDetail.website,
    employees: contact.companyDetail.employees,
  }
}

/** Número principal para mostrar (móvil preferido). */
export function contactDisplayPhone(contact: {
  phone: string
  mobilePhone?: string
}): string {
  const mobile = contact.mobilePhone?.trim()
  if (mobile) return mobile
  const phone = contact.phone?.trim()
  if (phone && phone !== '—') return phone
  return ''
}

export function formatContactListSubtitle(role: string, company?: string): string {
  const roleLabel = role.trim() || 'Sin cargo'
  const companyLabel = company?.trim()
  return companyLabel ? `${roleLabel} en ${companyLabel}` : roleLabel
}

export function validateContactFormValues(
  values: ContactFormValues,
  options?: { excludeId?: string },
): string | null {
  if (!values.name.trim()) return 'El nombre es obligatorio.'
  const taxIdError = getContactTaxIdValidationMessage(
    values.identifierType,
    values.rut,
    { required: true },
  )
  if (taxIdError) return taxIdError
  const duplicateError = getDuplicateContactTaxIdMessage(
    values.identifierType,
    values.rut,
    options?.excludeId,
  )
  if (duplicateError) return duplicateError
  const emailError = getEmailValidationError(values.email, { required: true })
  if (emailError) return emailError
  const mobileError = getPhoneValidationError(values.mobilePhone, { required: true })
  if (mobileError) return mobileError
  if (!values.ownerName.trim()) return 'El responsable es obligatorio.'
  return null
}

export function listItemFromContactDetail(contact: ContactDetail): ContactListItem {
  const {
    location: _location,
    timezone: _timezone,
    createdAt: _createdAt,
    owner,
    companyDetail: _companyDetail,
    score: _score,
    pipelineValue: _pipelineValue,
    pendingActivities: _pendingActivities,
    nextActivity: _nextActivity,
    tags: _tags,
    activities: _activities,
    notes: _notes,
    opportunities: _opportunities,
    files: _files,
    ...list
  } = contact
  return stampRecordAuditOnUpdate({
    ...list,
    ownerName: owner.name,
  })
}

export function contactDetailToOverride(detail: ContactDetail): ContactDetailOverride {
  const {
    activities: _activities,
    notes: _notes,
    opportunities: _opportunities,
    files: _files,
    id: _id,
    ...rest
  } = detail
  return rest
}

export function applyFormValuesToContact(
  contact: ContactDetail,
  values: ContactFormValues,
): ContactDetail {
  const kind = inferContactKind(values)
  const companies = getAllKnownCompanies()
  const linked =
    kind === 'B2B' ? findCompanyById(companies, values.companyId.trim()) : undefined
  const companyName =
    kind === 'B2B' ? (linked?.name ?? values.company.trim()) : ''
  const role =
    kind === 'B2B'
      ? values.role.trim() || 'Sin cargo'
      : '—'

  const owner = {
    name: values.ownerName.trim() || getDefaultOwnerName(),
    avatarUrl:
      values.ownerName.trim() === contact.owner.name
        ? contact.owner.avatarUrl
        : undefined,
  }

  return {
    ...contact,
    ownerName: owner.name,
    name: values.name.trim(),
    rut: normalizeTaxIdValue(values.identifierType, values.rut),
    avatarUrl: values.avatarUrl.trim() || contact.avatarUrl,
    status: normalizeContactStatus(values.status),
    role,
    companyId: kind === 'B2B' ? values.companyId.trim() || undefined : undefined,
    company: companyName,
    streetAddress: values.streetAddress.trim() || undefined,
    region: values.region.trim() || undefined,
    commune: values.commune.trim() || undefined,
    location:
      formatContactLocation({
        streetAddress: values.streetAddress,
        commune: values.commune,
        region: values.region,
      }) ?? values.location.trim(),
    email: values.email.trim(),
    phone: values.mobilePhone.trim() || '—',
    mobilePhone: values.mobilePhone.trim() || undefined,
    linkedIn: values.linkedIn.trim() || undefined,
    initialNote: values.initialNote.trim() || undefined,
    timezone: values.timezone.trim(),
    source: values.source.trim(),
    subtitle: formatContactListSubtitle(role, companyName),
    owner,
    companyDetail: {
      name: companyName,
      industry: linked?.industry ?? values.industry.trim(),
      website: values.website.trim(),
      employees: linked?.employees ?? values.employees.trim(),
    },
  }
}
