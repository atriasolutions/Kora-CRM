import type { CompanyBranchRecord, CompanyAddressRecord } from '@/lib/company-location'

const cityCoords: Record<string, { lat: number; lng: number; region: string; country: string }> = {
  'Buenos Aires': { lat: -34.6037, lng: -58.3816, region: 'CABA', country: 'Argentina' },
  Bogotá: { lat: 4.711, lng: -74.0721, region: 'Cundinamarca', country: 'Colombia' },
  Monterrey: { lat: 25.6866, lng: -100.3161, region: 'Nuevo León', country: 'México' },
  'Ciudad de México': { lat: 19.4326, lng: -99.1332, region: 'CDMX', country: 'México' },
  Madrid: { lat: 40.4168, lng: -3.7038, region: 'Comunidad de Madrid', country: 'España' },
  Rosario: { lat: -32.9442, lng: -60.6505, region: 'Santa Fe', country: 'Argentina' },
  Santiago: { lat: -33.4489, lng: -70.6693, region: 'RM', country: 'Chile' },
  Lima: { lat: -12.0464, lng: -77.0428, region: 'Lima', country: 'Perú' },
}

export function coordsForCity(city: string): {
  lat: number
  lng: number
  region: string
  country: string
} {
  return (
    cityCoords[city] ?? {
      lat: -33.4489,
      lng: -70.6693,
      region: '',
      country: 'Chile',
    }
  )
}

const companyRuts: Record<string, string> = {
  'Tech Solutions': '76.123.456-7',
  'Nova Retail': '900.456.789-1',
  'Industrial Plus': '84.555.222-3',
  BlueWave: '55.888.111-K',
  FinNova: 'B88234156',
  AgroSur: '30.712.890-4',
  'Logistics Co': '96.789.100-2',
  'MedLab Digital': '77.654.321-0',
}

export function rutForCompany(name: string): string {
  return companyRuts[name] ?? '76.000.000-0'
}

export function buildHeadquarters(
  companyId: string,
  name: string,
  city: string,
  street?: string,
): CompanyAddressRecord {
  const geo = coordsForCity(city)
  const streets: Record<string, string> = {
    'Tech Solutions': 'Av. Corrientes 1234, Piso 8',
    'Nova Retail': 'Carrera 15 # 93-47',
    'Industrial Plus': 'Av. Insurgentes Sur 1602',
    BlueWave: 'Paseo de la Reforma 250',
    FinNova: 'Calle de Alcalá 45',
    AgroSur: 'Bv. Oroño 650',
    'Logistics Co': 'Av. Apoquindo 4700',
    'MedLab Digital': 'Av. Javier Prado Este 4200',
  }
  return {
    id: `${companyId}-hq`,
    label: 'Casa matriz',
    street: street ?? streets[name] ?? `Av. Principal 100`,
    city,
    region: geo.region,
    country: geo.country,
    postalCode: '0000000',
    lat: geo.lat,
    lng: geo.lng,
    isHeadquarters: true,
  }
}

export function buildBranches(
  companyId: string,
  name: string,
  city: string,
): CompanyBranchRecord[] {
  const geo = coordsForCity(city)
  const offset = 0.02 + (name.length % 5) * 0.005
  return [
    {
      id: `${companyId}-br-1`,
      name: `Sucursal ${city}`,
      street: 'Centro de distribución',
      city,
      region: geo.region,
      country: geo.country,
      phone: '+56 2 2000 0000',
      lat: geo.lat - offset,
      lng: geo.lng + offset,
    },
    {
      id: `${companyId}-br-2`,
      name: 'Sucursal comercial norte',
      street: 'Zona industrial',
      city,
      region: geo.region,
      country: geo.country,
      lat: geo.lat + offset,
      lng: geo.lng - offset,
    },
  ]
}

export function buildAdditionalAddresses(
  companyId: string,
  city: string,
): CompanyAddressRecord[] {
  const geo = coordsForCity(city)
  return [
    {
      id: `${companyId}-addr-billing`,
      label: 'Facturación',
      street: 'Oficina contable / Depto. 402',
      city,
      region: geo.region,
      country: geo.country,
      lat: geo.lat + 0.008,
      lng: geo.lng + 0.008,
    },
  ]
}
