import type { CompanyListItem } from '@/data/companies.mock'
import type { ContactListItem } from '@/data/contacts.mock'
import { contactBelongsToCompany, findContactById } from '@/lib/contact-lookup'

export type ContactLookupDependentFields = {
  contactId: string
  contactName: string
  contactEmail?: string
  contactPhone?: string
}

export function emptyContactLookupFields(): ContactLookupDependentFields & {
  contactEmail: string
  contactPhone: string
} {
  return {
    contactId: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  }
}

/**
 * Al cambiar o quitar la empresa padre, indica si hay que limpiar el contacto dependiente.
 */
export function shouldClearContactOnCompanyChange(
  nextCompanyId: string,
  contactId: string,
  contacts: ContactListItem[],
  companyName?: string,
  companies?: CompanyListItem[],
): boolean {
  if (!nextCompanyId.trim()) return Boolean(contactId.trim())

  if (!contactId.trim()) return false

  const contact = findContactById(contacts, contactId)
  /** Catálogo aún sin cargar: no borrar el contacto ya guardado en la ficha. */
  if (!contact) return false

  return !contactBelongsToCompany(
    contact,
    nextCompanyId,
    companyName,
    companies,
  )
}
