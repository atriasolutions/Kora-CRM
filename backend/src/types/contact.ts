export type ContactStatus = 'Prospecto' | 'Cliente' | 'Proveedor'

export type ContactListItem = {
  id: string
  name: string
  subtitle: string
  avatarUrl: string
  companyId?: string
  company: string
  email: string
  phone: string
  role: string
  status: ContactStatus
  lastContactLabel: string
  rut?: string
  mobilePhone?: string
  streetAddress?: string
  region?: string
  commune?: string
  linkedIn?: string
  source?: string
  initialNote?: string
  ownerName?: string
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
}

export type ContactDetail = ContactListItem & {
  city?: string
}

export type CreateContactInput = {
  name: string
  avatarUrl?: string
  companyId?: string | null
  company?: string
  email?: string
  phone?: string
  mobilePhone?: string
  role?: string
  status?: ContactStatus
  rut?: string
  streetAddress?: string
  region?: string
  commune?: string
  linkedIn?: string
  source?: string
  initialNote?: string
  ownerName?: string
  subtitle?: string
}

export type UpdateContactInput = Partial<CreateContactInput>
