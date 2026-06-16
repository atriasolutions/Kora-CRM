export type CompanyLifecycle = 'Prospecto' | 'Cliente' | 'Proveedor'
export type CompanyOperationalStatus = 'Activa' | 'Inactiva'

export type CompanyListItem = {
  id: string
  name: string
  logoUrl: string
  rut: string
  headquartersStreet?: string
  industry: string
  city: string
  employees: string
  owner: string
  lifecycle: CompanyLifecycle
  operationalStatus: CompanyOperationalStatus
  lastActivity: string
  website: string
  email: string
  phone: string
  description: string
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
}

export type CreateCompanyInput = {
  name: string
  logoUrl?: string
  rut?: string
  headquartersStreet?: string
  industry?: string
  city?: string
  employees?: string
  ownerName?: string
  lifecycle?: CompanyLifecycle
  operationalStatus?: CompanyOperationalStatus
  website?: string
  email?: string
  phone?: string
  description?: string
}

export type UpdateCompanyInput = Partial<CreateCompanyInput>
