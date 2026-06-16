import { API_V1 } from '@/api/config'
import { fetchJSON } from '@/api/client'
import { fetchAllPages } from '@/api/list-all'
import type { ApiItemResponse } from '@/api/types'
import type { CompanyDetail } from '@/data/company-detail.mock'
import type { CompanyListItem } from '@/data/companies.mock'
import type {
  CompanyAddressRecord,
  CompanyBranchRecord,
} from '@/lib/company-location'
import type { CreateCompanyFormValues } from '@/lib/company-create'
import type { CompanyFormValues } from '@/lib/company-form'
import { companyFormValuesToDetail } from '@/lib/company-form'
import { resolveEntityImageSrc } from '@/lib/image-upload'
import { cacheEntityListImage } from '@/lib/entity-list-image-cache'

const BASE = `${API_V1}/companies`

function normalizeCompany(company: CompanyListItem): CompanyListItem {
  const logoUrl = resolveEntityImageSrc(company.logoUrl) ?? ''
  if (logoUrl) {
    cacheEntityListImage('company', company.id, logoUrl)
  }
  return {
    ...company,
    logoUrl,
  }
}

export type CompanyApiBody = {
  name: string
  logoUrl?: string
  rut?: string
  headquartersStreet?: string
  industry?: string
  city?: string
  employees?: string
  ownerName?: string
  lifecycle?: string
  operationalStatus?: string
  website?: string
  email?: string
  phone?: string
  description?: string
}

export function companyFormToApiBody(
  values: CreateCompanyFormValues | CompanyFormValues,
): CompanyApiBody {
  return {
    name: values.name.trim(),
    logoUrl: values.logoUrl?.trim() || undefined,
    rut: values.rut?.trim() || undefined,
    headquartersStreet: values.headquartersStreet?.trim() || undefined,
    industry: values.industry?.trim() || undefined,
    city: values.city?.trim() || undefined,
    employees: values.employees?.trim() || undefined,
    ownerName: values.ownerName?.trim() || undefined,
    lifecycle: values.lifecycle,
    operationalStatus: values.operationalStatus,
    website: values.website?.trim() || undefined,
    email: values.email?.trim() || undefined,
    phone: values.phone?.trim() || undefined,
    description: values.description?.trim() || undefined,
  }
}

export function companyFormValuesToLocationsPayload(
  values: CreateCompanyFormValues | CompanyFormValues,
  companyId: string,
): CompanyLocationsPayload {
  return companyDetailToLocationsPayload(companyFormValuesToDetail(values, companyId))
}

export async function listCompaniesApi(archived: boolean): Promise<CompanyListItem[]> {
  const rows = await fetchAllPages<CompanyListItem>(BASE, {
    archived: archived ? 'true' : 'false',
  })
  return rows.map(normalizeCompany)
}

export async function getCompanyApi(id: string): Promise<CompanyListItem> {
  const res = await fetchJSON<ApiItemResponse<CompanyListItem>>(`${BASE}/${id}`)
  return normalizeCompany(res.data)
}

export type CompanyLocationsPayload = {
  headquarters?: CompanyAddressRecord | null
  branches: CompanyBranchRecord[]
  addresses: CompanyAddressRecord[]
}

export function companyHeadquartersToApi(
  hq: CompanyAddressRecord,
): NonNullable<CompanyLocationsPayload['headquarters']> {
  return {
    id: hq.id,
    label: hq.label,
    street: hq.street,
    city: hq.city,
    commune: hq.commune,
    region: hq.region,
    country: hq.country,
    postalCode: hq.postalCode,
    lat: hq.lat,
    lng: hq.lng,
  }
}

export async function getCompanyLocationsApi(
  id: string,
): Promise<CompanyLocationsPayload> {
  const res = await fetchJSON<ApiItemResponse<CompanyLocationsPayload>>(
    `${BASE}/${id}/locations`,
  )
  return res.data
}

export async function putCompanyLocationsApi(
  id: string,
  body: CompanyLocationsPayload,
): Promise<CompanyLocationsPayload> {
  const res = await fetchJSON<ApiItemResponse<CompanyLocationsPayload>>(
    `${BASE}/${id}/locations`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  return res.data
}

export async function createCompanyApi(
  body: CompanyApiBody,
): Promise<CompanyListItem> {
  const res = await fetchJSON<ApiItemResponse<CompanyListItem>>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return normalizeCompany(res.data)
}

export async function updateCompanyApi(
  id: string,
  body: Partial<CompanyApiBody>,
): Promise<CompanyListItem> {
  const res = await fetchJSON<ApiItemResponse<CompanyListItem>>(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return normalizeCompany(res.data)
}

export async function archiveCompanyApi(id: string): Promise<CompanyListItem> {
  const res = await fetchJSON<ApiItemResponse<CompanyListItem>>(
    `${BASE}/${id}/archive`,
    { method: 'POST' },
  )
  return normalizeCompany(res.data)
}

export async function restoreCompanyApi(id: string): Promise<CompanyListItem> {
  const res = await fetchJSON<ApiItemResponse<CompanyListItem>>(
    `${BASE}/${id}/restore`,
    { method: 'POST' },
  )
  return normalizeCompany(res.data)
}

export async function deleteCompanyApi(id: string): Promise<void> {
  await fetchJSON(`${BASE}/${id}`, { method: 'DELETE' })
}

export function companyDetailToApiBody(detail: CompanyDetail): CompanyApiBody {
  return {
    name: detail.name,
    logoUrl: detail.logoUrl,
    rut: detail.rut === '—' ? undefined : detail.rut,
    headquartersStreet: detail.headquarters.street || detail.headquartersStreet,
    industry: detail.industry,
    city: detail.city,
    employees: detail.employees,
    ownerName: detail.owner,
    lifecycle: detail.lifecycle,
    operationalStatus: detail.operationalStatus,
    website: detail.website?.trim() || undefined,
    email: detail.email?.trim() || undefined,
    phone: detail.phone?.trim() || undefined,
    description: detail.description?.trim() || undefined,
  }
}

export function companyDetailToLocationsPayload(
  detail: CompanyDetail,
): CompanyLocationsPayload {
  return {
    headquarters: companyHeadquartersToApi(detail.headquarters),
    branches: detail.branches,
    addresses: detail.addresses,
  }
}
