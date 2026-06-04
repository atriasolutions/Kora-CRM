export type CompanyAddressDto = {
  id: string
  label: string
  street: string
  city: string
  commune?: string
  region: string
  country: string
  postalCode?: string
  lat: number
  lng: number
}

export type CompanyHeadquartersInput = Omit<CompanyAddressDto, 'id'> & { id?: string }

export type CompanyBranchDto = {
  id: string
  name: string
  street: string
  city: string
  commune?: string
  region: string
  country: string
  postalCode?: string
  phone?: string
  lat: number
  lng: number
}

export type CompanyLocationsDto = {
  headquarters?: CompanyHeadquartersInput | null
  branches: CompanyBranchDto[]
  addresses: CompanyAddressDto[]
}
