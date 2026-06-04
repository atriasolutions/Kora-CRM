import { DEFAULT_COUNTRY } from '@/lib/location-country'
import { coordsForCity } from '@/data/company-locations.mock'
import type {
  CompanyAddressRecord,
  CompanyBranchRecord,
} from '@/lib/company-location'
import { emptyLocationFieldValues } from '@/lib/company-location-form'

export function createCompanyLocationId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function defaultGeoForCity(city: string) {
  return coordsForCity(city.trim() || 'Santiago')
}

export function emptyBranchDraft(city: string): Omit<CompanyBranchRecord, 'id'> {
  const location = emptyLocationFieldValues(city)
  const geo = defaultGeoForCity(location.city || city)
  return {
    name: '',
    street: location.street,
    city: location.city || city.trim() || 'Santiago',
    commune: location.commune,
    region: location.region,
    country: location.country || DEFAULT_COUNTRY,
    postalCode: location.postalCode,
    phone: '',
    lat: geo.lat,
    lng: geo.lng,
  }
}

export function emptyAddressDraft(city: string): Omit<CompanyAddressRecord, 'id'> {
  const location = emptyLocationFieldValues(city)
  const geo = defaultGeoForCity(location.city || city)
  return {
    label: '',
    street: location.street,
    city: location.city || city.trim() || 'Santiago',
    commune: location.commune,
    region: location.region,
    country: location.country || DEFAULT_COUNTRY,
    postalCode: location.postalCode,
    lat: geo.lat,
    lng: geo.lng,
  }
}
