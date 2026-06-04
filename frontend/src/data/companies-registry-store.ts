import type { CompanyListItem } from '@/data/companies.mock'

let registrySnapshot: CompanyListItem[] = []

export function syncRegistryCompanies(companies: CompanyListItem[]) {
  registrySnapshot = companies
}

export function getRegistryCompanyById(id: string): CompanyListItem | undefined {
  return registrySnapshot.find((c) => c.id === id)
}

export function getAllKnownCompanies(): CompanyListItem[] {
  return registrySnapshot
}
