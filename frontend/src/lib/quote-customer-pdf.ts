import type { CompanyListItem } from '@/data/companies.mock'
import type { QuoteDetail } from '@/data/quote-detail.mock'
import { coordsForCity } from '@/data/company-locations.mock'
import type { CompanyAddressRecord } from '@/lib/company-location'
import { formatRutDisplay } from '@/lib/company-location'
import { isChileCountry } from '@/lib/location-country'

export type QuoteCustomerPdfFields = {
  companyName: string
  rut: string
  address: string
  region: string
  commune: string
  contact: string
  industry: string
}

/** Datos del cliente para el PDF (casa matriz de la empresa vinculada). */
export function resolveQuoteCustomerPdfFields(
  quote: QuoteDetail,
  company?: CompanyListItem,
  headquarters?: CompanyAddressRecord,
): QuoteCustomerPdfFields {
  const hq = headquarters
  const chileCustomer = isChileCountry(hq?.country)
  const fallbackCity = company?.city?.trim() ?? hq?.city?.trim() ?? ''
  const geo =
    chileCustomer && fallbackCity ? coordsForCity(fallbackCity) : { region: '' }

  const street =
    hq?.street?.trim() || company?.headquartersStreet?.trim() || '—'

  const commune =
    hq?.commune?.trim() ||
    (chileCustomer ? hq?.city?.trim() : '') ||
    fallbackCity ||
    '—'

  const region = hq?.region?.trim() || (chileCustomer ? geo.region : '') || '—'

  const contactParts = [
    quote.contactName?.trim(),
    quote.contactEmail?.trim(),
  ].filter((part) => part && part !== '—')

  const rutRaw = company?.rut?.trim() ?? ''
  const rut = rutRaw ? formatRutDisplay(rutRaw) : '—'

  return {
    companyName: quote.companyName?.trim() || company?.name?.trim() || '—',
    rut,
    address: street,
    region,
    commune,
    contact: contactParts.length > 0 ? contactParts.join(' · ') : '—',
    industry: company?.industry?.trim() || '—',
  }
}
