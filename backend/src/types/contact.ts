export type ContactStatus = 'Prospecto' | 'Cliente' | 'Proveedor'

export type ContactLegalBasis =
  | 'consentimiento'
  | 'contrato'
  | 'interes_legitimo'
  | 'obligacion_legal'
  | 'interes_vital'
  | 'datos_economicos'

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
  treatmentOpposition?: boolean
  treatmentBlockedAt?: string
  marketingConsent?: boolean | null
  marketingConsentAt?: string
  legalBasis?: ContactLegalBasis
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
  treatmentOpposition?: boolean
  treatmentBlocked?: boolean
  marketingConsent?: boolean | null
  legalBasis?: ContactLegalBasis
}

export type UpdateContactInput = Partial<CreateContactInput>
