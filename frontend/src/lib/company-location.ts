export type CompanyGeoPoint = {
  lat: number
  lng: number
}

export type CompanyAddressRecord = {
  id: string
  label: string
  street: string
  city: string
  /** Comuna (Chile); opcional. */
  commune?: string
  region: string
  country: string
  postalCode?: string
  lat: number
  lng: number
  isHeadquarters?: boolean
}

export type CompanyBranchRecord = {
  id: string
  name: string
  street: string
  city: string
  /** Comuna (Chile); opcional. */
  commune?: string
  region: string
  country: string
  postalCode?: string
  phone?: string
  lat: number
  lng: number
}

export function formatAddressLine(parts: {
  street?: string
  city?: string
  commune?: string
  region?: string
  country?: string
  postalCode?: string
}): string {
  const segments: string[] = []
  for (const part of [
    parts.street,
    parts.commune,
    parts.city,
    parts.region,
    parts.postalCode,
    parts.country,
  ]) {
    const trimmed = part?.trim()
    if (!trimmed) continue
    if (/^0+$/.test(trimmed.replace(/\s/g, ''))) continue
    const last = segments[segments.length - 1]
    if (last && last.toLowerCase() === trimmed.toLowerCase()) continue
    segments.push(trimmed)
  }
  return segments.join(', ')
}

export function googleMapsEmbedUrl(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`
}

export function googleMapsEmbedFromCoords(lat: number, lng: number, zoom = 15): string {
  return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`
}

export function hasMeaningfulAddress(parts: {
  street?: string
  commune?: string
  city?: string
}): boolean {
  return Boolean(parts.street?.trim() || parts.commune?.trim() || parts.city?.trim())
}

export function resolveMapEmbedUrl(
  parts: Parameters<typeof formatAddressLine>[0],
  lat: number,
  lng: number,
  zoom = 15,
): string {
  if (hasMeaningfulAddress(parts)) {
    return googleMapsEmbedUrl(formatAddressLine(parts))
  }
  return googleMapsEmbedFromCoords(lat, lng, zoom)
}

export function googleMapsExternalUrl(lat: number, lng: number, label?: string): string {
  const q = label ? encodeURIComponent(label) : `${lat},${lng}`
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

export function resolveMapExternalUrl(
  parts: Parameters<typeof formatAddressLine>[0],
  lat: number,
  lng: number,
): string {
  const addressLine = formatAddressLine(parts)
  if (hasMeaningfulAddress(parts)) {
    return googleMapsExternalUrl(lat, lng, addressLine)
  }
  return googleMapsExternalUrl(lat, lng)
}

export function formatRutDisplay(rut: string): string {
  const clean = rut.replace(/[^\dkK]/gi, '').toUpperCase()
  if (clean.length < 2) return rut
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${withDots}-${dv}`
}
