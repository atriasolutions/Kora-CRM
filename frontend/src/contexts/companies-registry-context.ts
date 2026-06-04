import { createContext } from 'react'

import type { CompanyDetail } from '@/data/company-detail.mock'
import type { CompanyListItem } from '@/data/companies.mock'
import type { CreateCompanyFormValues } from '@/lib/company-create'
import type { ArchivedCompanyRecord } from '@/lib/company-archive'

export type ArchivedCompanyEntry = ArchivedCompanyRecord & {
  company: CompanyListItem
}

export type CompaniesRegistryContextValue = {
  userCompanies: CompanyListItem[]
  allCompanies: CompanyListItem[]
  archivedCompanies: ArchivedCompanyEntry[]
  findById: (id: string) => CompanyListItem | undefined
  addCompany: (values: CreateCompanyFormValues) => Promise<CompanyListItem>
  addCompanies: (values: CreateCompanyFormValues[]) => Promise<CompanyListItem[]>
  updateCompanyFromDetail: (detail: CompanyDetail) => Promise<CompanyDetail>
  archiveCompany: (id: string) => Promise<void>
  archiveCompanies: (ids: string[]) => Promise<void>
  restoreCompany: (id: string) => void
  restoreCompanies: (ids: string[]) => Promise<void>
  permanentlyDeleteCompany: (id: string) => void
  permanentlyDeleteCompanies: (ids: string[]) => void
  isArchived: (id: string) => boolean
  reloadFromApi: () => Promise<void>
}

export const CompaniesRegistryContext =
  createContext<CompaniesRegistryContextValue | null>(null)
