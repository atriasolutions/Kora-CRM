import type { ContactDetail, ContactListItem } from '../types/contact.js'
import { entityImageUrlForList } from '../utils/entity-image.js'
import { formatActivityLabel, toIsoString } from '../utils/format.js'

export type ContactRow = {
  id: string
  name: string
  subtitle: string | null
  avatar_url: string | null
  company_id: string | null
  company_name: string
  email: string | null
  phone: string | null
  mobile_phone: string | null
  job_title: string | null
  status: ContactListItem['status']
  rut: string | null
  street_address: string | null
  region: string | null
  commune: string | null
  linked_in: string | null
  source: string | null
  initial_note: string | null
  owner_name: string | null
  last_contact_at: Date | null
  created_at: Date
  created_by_id: string | null
  created_by_name: string | null
  updated_at: Date
  updated_by_id: string | null
  updated_by_name: string | null
}

function normalizeContactStatusFromDb(
  status: string,
): ContactListItem['status'] {
  if (status === 'Lead') return 'Prospecto'
  return status as ContactListItem['status']
}

export function mapContactRow(row: ContactRow): ContactListItem {
  return {
    id: row.id,
    name: row.name,
    subtitle: row.subtitle ?? '',
    avatarUrl: entityImageUrlForList(`/api/v1/contacts/${row.id}/avatar`, row.avatar_url),
    companyId: row.company_id ?? undefined,
    company: row.company_name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    role: row.job_title ?? '',
    status: normalizeContactStatusFromDb(String(row.status)),
    lastContactLabel: formatActivityLabel(row.last_contact_at),
    rut: row.rut ?? undefined,
    mobilePhone: row.mobile_phone ?? undefined,
    streetAddress: row.street_address ?? undefined,
    region: row.region ?? undefined,
    commune: row.commune ?? undefined,
    linkedIn: row.linked_in ?? undefined,
    source: row.source ?? undefined,
    initialNote: row.initial_note ?? undefined,
    ownerName: row.owner_name ?? undefined,
    createdAt: toIsoString(row.created_at),
    createdById: row.created_by_id ?? '',
    createdByName: row.created_by_name ?? '',
    updatedAt: toIsoString(row.updated_at),
    updatedById: row.updated_by_id ?? '',
    updatedByName: row.updated_by_name ?? '',
  }
}

export function mapContactDetail(row: ContactRow): ContactDetail {
  return {
    ...mapContactRow(row),
    avatarUrl: row.avatar_url?.trim() ?? '',
  }
}
