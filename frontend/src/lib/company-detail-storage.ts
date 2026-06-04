import { STORAGE_PREFIX } from '@/config/brand'
import { isLocalDetailStorageActive } from '@/lib/local-detail-storage'
import type { CompanyDetail } from '@/data/company-detail.mock'
import type { CompanyListItem } from '@/data/companies.mock'

const STORAGE_KEY = `${STORAGE_PREFIX}-crm-company-details`

export type CompanyDetailOverride = Partial<
  Omit<
    CompanyDetail,
    'id' | 'activities' | 'notes' | 'opportunities' | 'files' | 'linkedContacts'
  >
>

function readAll(): Record<string, CompanyDetailOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, CompanyDetailOverride>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, CompanyDetailOverride>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* quota */
  }
}

export function loadCompanyDetailOverride(
  companyId: string,
): CompanyDetailOverride | null {
  if (!isLocalDetailStorageActive()) return null
  const entry = readAll()[companyId]
  return entry ?? null
}

export function persistCompanyDetailOverride(
  companyId: string,
  override: CompanyDetailOverride,
) {
  if (!isLocalDetailStorageActive()) return
  const all = readAll()
  all[companyId] = { ...all[companyId], ...override }
  writeAll(all)
}

export function removeCompanyDetailOverride(companyId: string) {
  if (!isLocalDetailStorageActive()) return
  const all = readAll()
  if (!all[companyId]) return
  delete all[companyId]
  writeAll(all)
}

export function mergeCompanyDetailOverride(
  base: CompanyDetail,
  override: CompanyDetailOverride | null,
): CompanyDetail {
  if (!override) return base
  return {
    ...base,
    ...override,
    ownerDetail: override.ownerDetail ?? base.ownerDetail,
    headquarters: override.headquarters ?? base.headquarters,
    branches: override.branches ?? base.branches,
    addresses: override.addresses ?? base.addresses,
    tags: override.tags ?? base.tags,
    nextActivity: override.nextActivity ?? base.nextActivity,
  }
}

const LIST_FIELD_KEYS = [
  'name',
  'logoUrl',
  'rut',
  'headquartersStreet',
  'industry',
  'city',
  'employees',
  'owner',
  'lifecycle',
  'operationalStatus',
  'lastActivity',
] as const satisfies readonly (keyof CompanyListItem)[]

export function applyCompanyListOverride(
  base: CompanyListItem,
  override: CompanyDetailOverride | null,
): CompanyListItem {
  if (!override) return base
  const next: CompanyListItem = { ...base }
  for (const key of LIST_FIELD_KEYS) {
    const value = override[key]
    if (value !== undefined) {
      ;(next as Record<string, unknown>)[key] = value
    }
  }
  if (override.ownerDetail?.name) {
    next.owner = override.ownerDetail.name
  } else if (override.owner) {
    next.owner = override.owner
  }
  return next
}
