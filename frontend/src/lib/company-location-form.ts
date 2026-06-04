import type {
  CompanyAddressRecord,
  CompanyBranchRecord,
} from '@/lib/company-location'
import { defaultGeoForCity } from '@/lib/company-locations-mutate'
import { DEFAULT_COUNTRY, isChileCountry, normalizeCountryValue } from '@/lib/location-country'

export type CompanyLocationFieldValues = {
  street: string
  country: string
  region: string
  commune: string
  city: string
  postalCode: string
}

export function emptyLocationFieldValues(defaultCity = ''): CompanyLocationFieldValues {
  return {
    street: '',
    country: DEFAULT_COUNTRY,
    region: '',
    commune: '',
    city: defaultCity.trim(),
    postalCode: '',
  }
}

export function branchToLocationFields(
  branch: Pick<
    CompanyBranchRecord,
    'street' | 'country' | 'region' | 'commune' | 'city' | 'postalCode'
  >,
): CompanyLocationFieldValues {
  return {
    street: branch.street,
    country: normalizeCountryValue(branch.country),
    region: branch.region,
    commune: branch.commune ?? '',
    city: branch.city,
    postalCode: branch.postalCode ?? '',
  }
}

export function addressToLocationFields(
  address: Pick<
    CompanyAddressRecord,
    'street' | 'country' | 'region' | 'commune' | 'city' | 'postalCode'
  >,
): CompanyLocationFieldValues {
  return {
    street: address.street,
    country: normalizeCountryValue(address.country),
    region: address.region,
    commune: address.commune ?? '',
    city: address.city,
    postalCode: address.postalCode ?? '',
  }
}

export function validateCompanyLocationFields(
  values: CompanyLocationFieldValues,
): string | null {
  if (!values.country.trim()) return 'El país es obligatorio.'
  if (isChileCountry(values.country)) {
    if (!values.region.trim()) return 'Selecciona una región.'
    if (!values.commune.trim()) return 'Selecciona una comuna.'
  } else {
    if (!values.region.trim()) {
      return 'Indica la región, estado o provincia.'
    }
    if (!values.commune.trim()) {
      return 'Indica la comuna, municipio o localidad.'
    }
    if (!values.city.trim()) return 'La ciudad es obligatoria.'
  }
  return null
}

export function resolveLocationFieldsForSave(
  values: CompanyLocationFieldValues,
  defaultCity: string,
): Pick<
  CompanyAddressRecord,
  'street' | 'city' | 'commune' | 'region' | 'country' | 'postalCode' | 'lat' | 'lng'
> {
  const chileLocation = isChileCountry(values.country)
  const commune = values.commune.trim()
  const region = values.region.trim()
  const city = chileLocation
    ? commune || values.city.trim() || defaultCity
    : values.city.trim() || commune || defaultCity
  const geo = defaultGeoForCity(city)

  return {
    street: values.street.trim(),
    city,
    commune: commune || undefined,
    region: region || (chileLocation ? geo.region : ''),
    country: values.country.trim() || DEFAULT_COUNTRY,
    postalCode: values.postalCode.trim() || undefined,
    lat: geo.lat,
    lng: geo.lng,
  }
}
