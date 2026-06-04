const CHILE_ALIASES = new Set(['chile', 'cl', 'república de chile', 'republica de chile'])

/** País vacío se trata como Chile (compatibilidad con registros antiguos). */
export function isChileCountry(country: string | undefined | null): boolean {
  const normalized = country?.trim().toLowerCase() ?? ''
  if (!normalized) return true
  return CHILE_ALIASES.has(normalized)
}

export const DEFAULT_COUNTRY = 'Chile'

/** Chile primero; resto en orden alfabético (español). */
export const COUNTRY_OPTIONS = [
  DEFAULT_COUNTRY,
  'Alemania',
  'Argentina',
  'Bolivia',
  'Brasil',
  'China',
  'Colombia',
  'Costa Rica',
  'Ecuador',
  'El Salvador',
  'España',
  'Estados Unidos',
  'Guatemala',
  'Honduras',
  'México',
  'Nicaragua',
  'Panamá',
  'Paraguay',
  'Perú',
  'República Dominicana',
  'Uruguay',
  'Venezuela',
] as const

export type CountryOption = (typeof COUNTRY_OPTIONS)[number]

export function normalizeCountryValue(country: string | undefined | null): string {
  const trimmed = country?.trim() ?? ''
  if (!trimmed) return DEFAULT_COUNTRY
  const match = COUNTRY_OPTIONS.find(
    (option) => option.toLowerCase() === trimmed.toLowerCase(),
  )
  return match ?? trimmed
}

export function countrySelectOptions(
  currentValue?: string,
): { value: string; label: string }[] {
  const normalized = normalizeCountryValue(currentValue)
  const options = COUNTRY_OPTIONS.map((country) => ({ value: country, label: country }))
  if (normalized && !options.some((option) => option.value === normalized)) {
    options.push({ value: normalized, label: normalized })
  }
  return options
}
