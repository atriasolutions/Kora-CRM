import type { CompanyListItem } from '@/data/companies.mock'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import type { CompanyAddressRecord } from '@/lib/company-location'
import { coordsForCity } from '@/data/company-locations.mock'
import { isChileCountry } from '@/lib/location-country'

export type SupplierPdfFields = {
  name: string
  rut: string
  street: string
  commune: string
  region: string
  giro: string
  contact: string
}

/** Datos del proveedor para la OC (casa matriz), sin mezclar bodega de entrega. */
export function resolveSupplierPdfFields(
  purchase: PurchaseDetail,
  supplierCompany?: CompanyListItem,
  headquarters?: CompanyAddressRecord,
): SupplierPdfFields {
  const hq = headquarters
  const chileSupplier = isChileCountry(hq?.country)
  const fallbackCity = supplierCompany?.city?.trim() ?? hq?.city?.trim() ?? ''
  const geo = chileSupplier && fallbackCity ? coordsForCity(fallbackCity) : { region: '' }

  const street =
    hq?.street?.trim() ||
    supplierCompany?.headquartersStreet?.trim() ||
    '—'

  const commune = hq?.commune?.trim() || (chileSupplier ? hq?.city?.trim() : '') || fallbackCity || '—'

  const region = hq?.region?.trim() || (chileSupplier ? geo.region : '') || '—'

  return {
    name: purchase.supplier.trim() || supplierCompany?.name?.trim() || '—',
    rut: supplierCompany?.rut?.trim() || '—',
    street,
    commune,
    region,
    giro: supplierCompany?.industry?.trim() || purchase.productSummary?.trim() || '—',
    contact: purchase.supplierContact?.trim() || '—',
  }
}

export function formatDeliveryLocation(purchase: PurchaseDetail): string {
  const parts = [purchase.warehouse?.trim(), purchase.deliveryAddress?.trim()].filter(
    Boolean,
  ) as string[]
  return parts.length > 0 ? parts.join(' · ') : '—'
}
