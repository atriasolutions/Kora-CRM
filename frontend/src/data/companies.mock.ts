import type { RecordAuditFields } from '@/lib/record-audit'
import { ensureRecordAuditList } from '@/lib/seed-audit'

export type CompanyLifecycleStatus = 'Prospecto' | 'Cliente' | 'Proveedor'
export type CompanyOperationalStatus = 'Activa' | 'Inactiva'

function companyLogoSeed(_name: string): string {
  return ''
}

export type CompanyListItem = {
  id: string
  name: string
  logoUrl: string
  rut: string
  headquartersStreet?: string
  industry: string
  city: string
  employees: string
  owner: string
  lifecycle: CompanyLifecycleStatus
  operationalStatus: CompanyOperationalStatus
  lastActivity: string
} & RecordAuditFields

export const COMPANY_LIST_TOTAL_DEMO = 86

const companyListSeedRaw: Omit<CompanyListItem, keyof RecordAuditFields>[] = [
  {
    id: 'co1',
    name: 'Tech Solutions',
    logoUrl: companyLogoSeed('Tech Solutions'),
    rut: '76.123.456-7',
    industry: 'Software B2B',
    city: 'Buenos Aires',
    employees: '120',
    owner: 'María López',
    lifecycle: 'Cliente',
    operationalStatus: 'Activa',
    lastActivity: 'Hoy · Email',
  },
  {
    id: 'co2',
    name: 'Nova Retail',
    logoUrl: companyLogoSeed('Nova Retail'),
    rut: '900.456.789-1',
    industry: 'Retail',
    city: 'Bogotá',
    employees: '340',
    owner: 'Carlos Vega',
    lifecycle: 'Prospecto',
    operationalStatus: 'Activa',
    lastActivity: 'Ayer · Llamada',
  },
  {
    id: 'co3',
    name: 'Industrial Plus',
    logoUrl: companyLogoSeed('Industrial Plus'),
    rut: '84.555.222-3',
    industry: 'Manufactura',
    city: 'Monterrey',
    employees: '890',
    owner: 'Ana Ruiz',
    lifecycle: 'Prospecto',
    operationalStatus: 'Activa',
    lastActivity: '12 may · Reunión',
  },
  {
    id: 'co4',
    name: 'BlueWave',
    logoUrl: companyLogoSeed('BlueWave'),
    rut: '55.888.111-K',
    industry: 'E-commerce',
    city: 'Ciudad de México',
    employees: '45',
    owner: 'María López',
    lifecycle: 'Proveedor',
    operationalStatus: 'Activa',
    lastActivity: '10 may · Demo',
  },
  {
    id: 'co5',
    name: 'FinNova',
    logoUrl: companyLogoSeed('FinNova'),
    rut: 'B88234156',
    industry: 'Fintech',
    city: 'Madrid',
    employees: '210',
    owner: 'Diego Méndez',
    lifecycle: 'Cliente',
    operationalStatus: 'Inactiva',
    lastActivity: '3 abr · Archivo',
  },
  {
    id: 'co6',
    name: 'AgroSur',
    logoUrl: companyLogoSeed('AgroSur'),
    rut: '30.712.890-4',
    industry: 'Agroindustria',
    city: 'Rosario',
    employees: '520',
    owner: 'Laura Fernández',
    lifecycle: 'Cliente',
    operationalStatus: 'Activa',
    lastActivity: '8 may · Propuesta',
  },
  {
    id: 'co7',
    name: 'Logistics Co',
    logoUrl: companyLogoSeed('Logistics Co'),
    rut: '96.789.100-2',
    industry: 'Logística',
    city: 'Santiago',
    employees: '1.200',
    owner: 'Roberto Sánchez',
    lifecycle: 'Cliente',
    operationalStatus: 'Activa',
    lastActivity: '6 may · WhatsApp',
  },
  {
    id: 'co8',
    name: 'MedLab Digital',
    logoUrl: companyLogoSeed('MedLab Digital'),
    rut: '77.654.321-0',
    industry: 'Salud',
    city: 'Lima',
    employees: '78',
    owner: 'Valentina Torres',
    lifecycle: 'Prospecto',
    operationalStatus: 'Activa',
    lastActivity: '5 may · Email',
  },
]

export const companyListSeed: CompanyListItem[] = ensureRecordAuditList(
  companyListSeedRaw,
  (c) => c.owner,
)
