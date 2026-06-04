import { getRegistryCompanyById } from '@/data/companies-registry-store'
import type { CompanyListItem } from '@/data/companies.mock'
import { companyListSeed } from '@/data/companies.mock'
import {
  applyCompanyListOverride,
  loadCompanyDetailOverride,
  mergeCompanyDetailOverride,
} from '@/lib/company-detail-storage'
import { mergeCompanyListImage } from '@/lib/entity-list-image-cache'
import {
  buildAdditionalAddresses,
  buildBranches,
  buildHeadquarters,
  rutForCompany,
} from '@/data/company-locations.mock'
import { opportunitiesForCompany as seedOpportunitiesForCompany } from '@/data/opportunities.mock'
import { mergeEntityNotesForMock } from '@/lib/entity-notes-storage'
import { buildCompanyActivitiesForDetail } from '@/lib/company-activities'
import { getCompanyFiles, type CompanyFile } from '@/lib/company-files'
import { quoteSummariesForOpportunity } from '@/lib/quote-relations'
import type { CompanyAddressRecord, CompanyBranchRecord } from '@/lib/company-location'
import type {
  ContactActivity,
  ContactActivityType,
  ContactNote,
  ContactOpportunity,
} from '@/data/contact-detail.mock'

export type { ContactActivity as CompanyActivity, ContactActivityType as CompanyActivityType }
export type CompanyNote = ContactNote
export type CompanyOpportunity = ContactOpportunity

export type CompanyLinkedContact = {
  id: string
  name: string
  role: string
  email: string
}

export type CompanyDetail = CompanyListItem & {
  headquarters: CompanyAddressRecord
  branches: CompanyBranchRecord[]
  addresses: CompanyAddressRecord[]
  website: string
  phone: string
  email: string
  description: string
  ownerDetail: { name: string; avatarUrl?: string }
  pipelineValue: string
  contactCount: number
  pendingActivities: number
  nextActivity?: { title: string; when: string }
  tags: string[]
  activities: ContactActivity[]
  notes: CompanyNote[]
  opportunities: CompanyOpportunity[]
  files: CompanyFile[]
  linkedContacts: CompanyLinkedContact[]
}

export function resolveCompanyListItem(
  id: string,
  base?: CompanyListItem,
): CompanyListItem {
  const fromRegistry = getRegistryCompanyById(id)
  if (fromRegistry) {
    return mergeCompanyListImage(
      applyCompanyListOverride({ ...fromRegistry, id }, loadCompanyDetailOverride(id)),
    )
  }
  if (base) {
    return mergeCompanyListImage(
      applyCompanyListOverride({ ...base, id }, loadCompanyDetailOverride(id)),
    )
  }

  const direct = companyListSeed.find((c) => c.id === id)
  if (direct) {
    return applyCompanyListOverride({ ...direct, id }, loadCompanyDetailOverride(id))
  }

  const pageMatch = /^empresas-(\d+)$/.exec(id)
  if (pageMatch) {
    const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
    const seed = companyListSeed[idx % companyListSeed.length]
    return applyCompanyListOverride({ ...seed!, id }, loadCompanyDetailOverride(id))
  }

  throw new Error(`Empresa no encontrada: ${id}`)
}

export function getCompanyDetail(id: string): CompanyDetail {
  const base = resolveCompanyListItem(id)
  const idx = companyListSeed.findIndex((s) => s.name === base.name)

  const pipelineValues = ['$128,900', '$42,000', '$9,800', '$210,000', '$55,400']

  const rut = base.rut?.trim() ? base.rut : rutForCompany(base.name)
  const headquarters = buildHeadquarters(
    id,
    base.name,
    base.city,
    base.headquartersStreet,
  )
  const branches = buildBranches(id, base.name, base.city)
  const addresses = buildAdditionalAddresses(id, base.city)

  const built: CompanyDetail = {
    ...base,
    rut,
    headquarters,
    branches,
    addresses,
    owner: base.owner,
    website: `https://www.${base.name.toLowerCase().replace(/\s+/g, '')}.com`,
    phone: '+56 2 2345 6789',
    email: `comercial@${base.name.toLowerCase().replace(/\s+/g, '')}.com`,
    description: `Cuenta ${base.lifecycle.toLowerCase()} en sector ${base.industry}.`,
    ownerDetail: { name: base.owner },
    pipelineValue: pipelineValues[idx % pipelineValues.length]!,
    contactCount: (idx % 4) + 2,
    pendingActivities: (idx % 3) + 1,
    nextActivity:
      idx % 3 !== 0
        ? { title: 'Seguimiento post-propuesta', when: 'Mañana, 10:00' }
        : undefined,
    tags: [
      base.operationalStatus === 'Activa' ? 'Cuenta activa' : 'En pausa',
      base.lifecycle === 'Cliente' ? 'Renovación Q3' : 'Nutrición',
    ],
    activities: buildCompanyActivitiesForDetail({ ...base, id }),
    notes: [
      {
        id: `co-note-${id}-1`,
        body: 'Decisor principal: Director comercial. Ciclo de compra ~90 días.',
        author: base.owner,
        when: '14 may, 11:00',
      },
    ],
    opportunities: seedOpportunitiesForCompany(base.name, id).map((opp) => ({
      id: opp.id,
      name: opp.name,
      stage: opp.stage,
      amount: opp.amount,
      closeDate: opp.closeDate,
      quotes: quoteSummariesForOpportunity(opp.id),
    })),
    files: getCompanyFiles(id, base.owner),
    linkedContacts: [
      {
        id: `lc-${id}-1`,
        name: 'Juan Pérez',
        role: 'CTO',
        email: 'juan.perez@example.com',
      },
      {
        id: `lc-${id}-2`,
        name: 'María González',
        role: 'Directora comercial',
        email: 'maria@example.com',
      },
    ],
  }

  const merged = mergeCompanyDetailOverride(built, loadCompanyDetailOverride(id))
  merged.notes = mergeEntityNotesForMock('empresa', id, merged.notes ?? [])
  return merged
}
