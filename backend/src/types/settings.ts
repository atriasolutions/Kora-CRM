export type InvoicingMode = 'manual' | 'sii'

export type OrganizationSettings = {
  id: string
  legalName: string
  tradeName: string
  tagline: string
  rut: string
  giro: string
  address: string
  city: string
  region: string
  commune: string
  phone: string
  email: string
  logoUrl: string
  defaultVatPercent: number
  invoicingMode: InvoicingMode
  economicActivityCode: number | null
  defaultSolicitudAssigneeUserId: string | null
  defaultSolicitudAssigneeName: string
}

export type UpdateOrganizationSettingsInput = Partial<
  Omit<OrganizationSettings, 'id'>
>

export type Warehouse = {
  id: string
  name: string
  code: string
  address: string
  region: string
  commune: string
  isDefault: boolean
  active: boolean
}

export type CreateWarehouseInput = {
  name: string
  code?: string
  address?: string
  region?: string
  commune?: string
  isDefault?: boolean
  active?: boolean
}

export type UpdateWarehouseInput = Partial<
  Omit<Warehouse, 'id'>
>

export type ProductCategory = {
  id: string
  name: string
  active: boolean
}

export type CreateProductCategoryInput = {
  name: string
  active?: boolean
}

export type UpdateProductCategoryInput = Partial<
  Omit<ProductCategory, 'id'>
>
