import type { CompanyDetail } from '@/data/company-detail.mock'
import { buildHeadquarters, coordsForCity } from '@/data/company-locations.mock'
import type {
  CompanyLifecycleStatus,
  CompanyListItem,
  CompanyOperationalStatus,
} from '@/data/companies.mock'
import { getCommunesForRegion, isChileRegion } from '@/lib/chile-locations'
import type { CompanyAddressRecord } from '@/lib/company-location'
import { DEFAULT_COUNTRY, isChileCountry, normalizeCountryValue } from '@/lib/location-country'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import type { CompanyDetailOverride } from '@/lib/company-detail-storage'
import { stampRecordAuditOnCreate, stampRecordAuditOnUpdate } from '@/lib/record-audit'
import type { TaxIdentifierType } from '@/lib/tax-identifier'
import {
  getCompanyTaxIdValidationMessage,
  inferCompanyIdentifierType,
  normalizeCompanyTaxIdValue,
} from '@/lib/tax-identifier'
import { getDuplicateCompanyTaxIdMessage } from '@/lib/tax-id-uniqueness'
import {
  getEmailValidationError,
  getPhoneValidationError,
} from '@/lib/form-input-format'

function resolveHeadquartersRegion(hq: CompanyAddressRecord): string {
  const raw = hq.region?.trim() ?? ''
  if (isChileRegion(raw)) return raw
  if (raw === 'RM' || /metropolitana/i.test(raw)) return 'Metropolitana de Santiago'
  return ''
}

function resolveHeadquartersCommune(hq: CompanyAddressRecord, region: string): string {
  const stored = hq.commune?.trim()
  if (stored) return stored
  const city = hq.city?.trim()
  if (!city || !region) return ''
  const communes = getCommunesForRegion(region)
  return communes.includes(city) ? city : ''
}

export type CompanyFormValues = {
  name: string
  logoUrl: string
  identifierType: TaxIdentifierType
  rut: string
  lifecycle: CompanyLifecycleStatus
  operationalStatus: CompanyOperationalStatus
  industry: string
  city: string
  employees: string
  ownerName: string
  website: string
  phone: string
  email: string
  description: string
  headquartersStreet: string
  headquartersCity: string
  headquartersRegion: string
  headquartersCommune: string
  headquartersCountry: string
  headquartersPostalCode: string
}

export const COMPANY_LIFECYCLE_OPTIONS: CompanyLifecycleStatus[] = [
  'Prospecto',
  'Cliente',
  'Proveedor',
]

/** Compatibilidad con registros antiguos o CSV con «Lead». */
export function normalizeCompanyLifecycle(status: string): CompanyLifecycleStatus {
  const v = status.trim().toLowerCase()
  if (v === 'lead') return 'Prospecto'
  if (v === 'cliente' || v === 'customer') return 'Cliente'
  if (v === 'prospecto' || v === 'prospect') return 'Prospecto'
  if (v === 'proveedor' || v === 'supplier' || v === 'vendor') return 'Proveedor'
  if (COMPANY_LIFECYCLE_OPTIONS.includes(status.trim() as CompanyLifecycleStatus)) {
    return status.trim() as CompanyLifecycleStatus
  }
  return 'Prospecto'
}

export function createDefaultCompanyFormValues(
  partial?: Partial<CompanyFormValues>,
): CompanyFormValues {
  return {
    name: '',
    logoUrl: '',
    identifierType: 'RUT',
    rut: '',
    lifecycle: 'Prospecto',
    operationalStatus: 'Activa',
    industry: '',
    city: '',
    employees: '',
    ownerName: getDefaultOwnerName(),
    website: '',
    phone: '',
    email: '',
    description: '',
    headquartersStreet: '',
    headquartersCity: '',
    headquartersRegion: '',
    headquartersCommune: '',
    headquartersCountry: DEFAULT_COUNTRY,
    headquartersPostalCode: '',
    ...partial,
  }
}

export function createCompanyId(): string {
  return `company-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function createEmptyCompanyDetail(
  id: string,
  ownerName: string,
): CompanyDetail {
  const listItem = stampRecordAuditOnCreate({
    id,
    name: '',
    logoUrl: '',
    rut: '—',
    industry: '',
    city: '',
    employees: '—',
    owner: ownerName,
    lifecycle: 'Prospecto',
    operationalStatus: 'Activa',
    lastActivity: 'Recién creada',
  })
  return {
    ...listItem,
    headquarters: buildHeadquarters(id, '', '', ''),
    branches: [],
    addresses: [],
    website: '',
    phone: '',
    email: '',
    description: '',
    ownerDetail: { name: ownerName },
    pipelineValue: '$0',
    contactCount: 0,
    pendingActivities: 0,
    tags: [],
    activities: [],
    notes: [],
    opportunities: [],
    files: [],
    linkedContacts: [],
  }
}

export function companyFormValuesToDetail(
  values: CompanyFormValues,
  id = createCompanyId(),
): CompanyDetail {
  const ownerName =
    values.ownerName.trim() || getDefaultOwnerName()
  const shell = createEmptyCompanyDetail(id, ownerName)
  return applyFormValuesToCompany(shell, {
    ...values,
    lifecycle: normalizeCompanyLifecycle(values.lifecycle),
  })
}

function resolveInternationalHeadquartersFields(hq: CompanyAddressRecord): {
  headquartersRegion: string
  headquartersCommune: string
  city: string
} {
  const commune = hq.commune?.trim() || hq.city?.trim() || ''
  return {
    headquartersRegion: hq.region?.trim() || '',
    headquartersCommune: commune,
    city: hq.city?.trim() || commune,
  }
}

export function companyDetailToFormValues(company: CompanyDetail): CompanyFormValues {
  const hq = company.headquarters
  const chileLocation = isChileCountry(hq.country)
  const headquartersRegion = chileLocation ? resolveHeadquartersRegion(hq) : ''
  const headquartersCommune = chileLocation
    ? resolveHeadquartersCommune(hq, headquartersRegion)
    : ''
  const international = chileLocation ? null : resolveInternationalHeadquartersFields(hq)
  return {
    name: company.name,
    logoUrl: company.logoUrl,
    identifierType: inferCompanyIdentifierType(company.rut),
    rut: company.rut === '—' ? '' : company.rut,
    lifecycle: normalizeCompanyLifecycle(company.lifecycle),
    operationalStatus: company.operationalStatus,
    industry: company.industry,
    city: international?.city ?? company.city,
    employees: company.employees,
    ownerName: company.ownerDetail.name,
    website: company.website,
    phone: company.phone,
    email: company.email,
    description: company.description,
    headquartersStreet: hq.street,
    headquartersCity: hq.city,
    headquartersRegion: international?.headquartersRegion ?? headquartersRegion,
    headquartersCommune: international?.headquartersCommune ?? headquartersCommune,
    headquartersCountry: normalizeCountryValue(hq.country),
    headquartersPostalCode: hq.postalCode ?? '',
  }
}

export function validateCompanyFormValues(
  values: CompanyFormValues,
  options?: { excludeId?: string },
): string | null {
  if (!values.name.trim()) return 'El nombre de la empresa es obligatorio.'
  const taxIdError = getCompanyTaxIdValidationMessage(
    values.identifierType,
    values.rut,
    { required: false },
  )
  if (taxIdError) return taxIdError
  const duplicateError = getDuplicateCompanyTaxIdMessage(
    values.identifierType,
    values.rut,
    options?.excludeId,
  )
  if (duplicateError) return duplicateError
  if (!values.industry.trim()) return 'La industria es obligatoria.'
  if (!values.headquartersCountry.trim()) return 'El país es obligatorio.'
  if (isChileCountry(values.headquartersCountry)) {
    if (!values.headquartersRegion.trim()) return 'Selecciona una región.'
    if (!values.headquartersCommune.trim()) return 'Selecciona una comuna.'
  } else {
    if (!values.headquartersRegion.trim()) {
      return 'Indica la región, estado o provincia del proveedor.'
    }
    if (!values.headquartersCommune.trim()) {
      return 'Indica la comuna, municipio o localidad del proveedor.'
    }
    if (!values.city.trim()) return 'La ciudad es obligatoria.'
  }
  const emailError = getEmailValidationError(values.email)
  if (emailError) return emailError
  const phoneError = getPhoneValidationError(values.phone)
  if (phoneError) return phoneError
  return null
}

export function companyDetailToCreateFormValues(
  company: CompanyDetail,
): CompanyFormValues {
  return companyDetailToFormValues(company)
}

export function applyCreateFormToCompany(
  company: CompanyDetail,
  values: CompanyFormValues,
): CompanyDetail {
  return applyFormValuesToCompany(company, values)
}

export function listItemFromCompanyDetail(company: CompanyDetail): CompanyListItem {
  const {
    headquarters: _headquarters,
    branches: _branches,
    addresses: _addresses,
    website: _website,
    phone: _phone,
    email: _email,
    description: _description,
    createdAt: _createdAt,
    ownerDetail,
    pipelineValue: _pipelineValue,
    contactCount: _contactCount,
    pendingActivities: _pendingActivities,
    nextActivity: _nextActivity,
    tags: _tags,
    activities: _activities,
    notes: _notes,
    opportunities: _opportunities,
    files: _files,
    linkedContacts: _linkedContacts,
    ...list
  } = company
  return stampRecordAuditOnUpdate({
    ...list,
    owner: ownerDetail.name,
  })
}

export function companyDetailToOverride(detail: CompanyDetail): CompanyDetailOverride {
  const {
    activities: _activities,
    notes: _notes,
    opportunities: _opportunities,
    files: _files,
    linkedContacts: _linkedContacts,
    id: _id,
    ...rest
  } = detail
  return rest
}

export function applyFormValuesToCompany(
  company: CompanyDetail,
  values: CompanyFormValues,
): CompanyDetail {
  const ownerName = values.ownerName.trim()
  const ownerDetail = {
    name: ownerName,
    avatarUrl:
      ownerName === company.ownerDetail.name
        ? company.ownerDetail.avatarUrl
        : undefined,
  }

  const chileLocation = isChileCountry(values.headquartersCountry)
  const hqCommune = values.headquartersCommune.trim()
  const hqRegion = values.headquartersRegion.trim()
  const hqCity = chileLocation
    ? hqCommune || values.city.trim() || company.headquarters.city
    : values.city.trim() || hqCommune || company.headquarters.city
  const geo = coordsForCity(hqCity)

  const headquarters = {
    ...company.headquarters,
    street: values.headquartersStreet.trim() || company.headquarters.street,
    city: hqCity,
    commune: hqCommune || undefined,
    region: hqRegion || (chileLocation ? geo.region : ''),
    country: values.headquartersCountry.trim() || DEFAULT_COUNTRY,
    postalCode: values.headquartersPostalCode.trim() || company.headquarters.postalCode,
    lat: geo.lat,
    lng: geo.lng,
  }

  const listCity = values.city.trim() || hqCity

  return {
    ...company,
    name: values.name.trim(),
    logoUrl: values.logoUrl.trim() || company.logoUrl,
    rut: normalizeCompanyTaxIdValue(values.identifierType, values.rut),
    lifecycle: normalizeCompanyLifecycle(values.lifecycle),
    operationalStatus: values.operationalStatus,
    industry: values.industry.trim(),
    city: listCity,
    employees: values.employees.trim(),
    owner: ownerDetail.name,
    ownerDetail,
    website: values.website.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    description: values.description.trim(),
    headquarters,
  }
}
