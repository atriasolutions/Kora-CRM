import { getAllKnownCompanies } from '@/data/companies-registry-store'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import { resolveCanonicalCompanyId } from '@/lib/company-lookup'
import type { CreateOpportunityFormValues } from '@/lib/opportunity-create'
import { buildDefaultOpportunityName } from '@/lib/opportunity-metadata'

export type CompanyOpportunityLookup = {
  id: string
  name: string
}

function norm(value: string): string {
  return value.trim().toLowerCase()
}

/** Oportunidades vinculadas a la empresa (por id o nombre). */
export function opportunitiesForCompany(
  opportunities: OpportunityListItem[],
  company: CompanyOpportunityLookup,
): OpportunityListItem[] {
  const companyName = norm(company.name)
  const companyId = company.id.trim()

  return opportunities.filter((opp) => {
    if (companyId && opp.companyId === companyId) return true
    if (companyName && norm(opp.company) === companyName) return true
    return false
  })
}

export function createOpportunityInitialFromCompany(company: {
  id: string
  name: string
  owner?: string
  ownerDetail?: { name: string }
}): Partial<CreateOpportunityFormValues> {
  const ownerName =
    company.ownerDetail?.name?.trim() ||
    company.owner?.trim() ||
    getDefaultOwnerName() ||
    'María López'

  const companyName = company.name.trim()
  const companyId = resolveCanonicalCompanyId(getAllKnownCompanies(), {
    id: company.id,
    name: companyName,
  })
  return {
    customerKind: 'empresa',
    companyId,
    company: companyName,
    contactName: '',
    ownerName,
    source: 'Formulario web',
    name: buildDefaultOpportunityName({
      customerKind: 'empresa',
      company: companyName,
      contactName: '',
    }),
  }
}
