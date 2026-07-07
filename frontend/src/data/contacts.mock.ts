import type { RecordAuditFields } from '@/lib/record-audit'
import { ensureRecordAuditList } from '@/lib/seed-audit'

export type ContactLifecycleStatus = 'Cliente' | 'Prospecto' | 'Proveedor'

export type ContactListItem = {
  id: string
  name: string
  subtitle: string
  avatarUrl: string
  /** Registro de empresa vinculado (lookup). */
  companyId?: string
  company: string
  email: string
  phone: string
  role: string
  status: ContactLifecycleStatus
  lastContactLabel: string
  /** RUT / identificador fiscal del contacto */
  rut?: string
  mobilePhone?: string
  streetAddress?: string
  region?: string
  commune?: string
  /** @deprecated Usar `commune`. Se mantiene por registros antiguos. */
  city?: string
  linkedIn?: string
  source?: string
  /** Nota capturada al crear el registro */
  initialNote?: string
  ownerName?: string
  treatmentOpposition?: boolean
  treatmentBlockedAt?: string
  marketingConsent?: boolean | null
  marketingConsentAt?: string
  legalBasis?: import('@/types/privacy').ContactLegalBasis
  /** ISO / datetime-local del último intento de contacto registrado. */
  lastOutreachAt?: string
  lastOutreachChannel?: import('@/data/contact-detail.mock').ContactActivityType
  lastOutreachResult?: import('@/lib/contact-outreach').ContactOutreachResult
  /** Etiqueta derivada del último intento (fecha · medio · resultado). */
  lastOutreachLabel?: string
  reachabilityStatus?: import('@/lib/contact-outreach').ContactReachabilityStatus
  outreachAttemptCount?: number
} & RecordAuditFields

/** Filas visibles en la demo + total simulado para paginación (como diseño NovaCRM). */
export const CONTACT_LIST_TOTAL_DEMO = 124

const contactListSeedRaw: Omit<ContactListItem, keyof RecordAuditFields>[] = [
  {
    id: 'c1',
    name: 'Juan Pérez',
    subtitle: 'CTO en Tech Solutions',
    avatarUrl: '',
    companyId: 'co1',
    company: 'Tech Solutions',
    email: 'juan.perez@techsolutions.com',
    phone: '+54 11 5843-9210',
    role: 'Chief Technology Officer',
    status: 'Cliente',
    lastContactLabel: 'Hoy, 10:30 · Llamada',
  },
  {
    id: 'c2',
    name: 'María González',
    subtitle: 'Directora comercial en Nova Retail',
    avatarUrl: '',
    companyId: 'co2',
    company: 'Nova Retail',
    email: 'maria.gonzalez@novaretail.com',
    phone: '+57 300 555-0142',
    role: 'Directora comercial',
    status: 'Prospecto',
    lastContactLabel: 'Ayer, 16:45 · Email',
  },
  {
    id: 'c3',
    name: 'Carlos Vega',
    subtitle: 'CEO en Industrial Plus',
    avatarUrl: '',
    companyId: 'co3',
    company: 'Industrial Plus',
    email: 'carlos@industrialplus.com.ar',
    phone: '+54 351 600-8899',
    role: 'CEO',
    status: 'Prospecto',
    lastContactLabel: '12 may · Reunión',
  },
  {
    id: 'c4',
    name: 'Ana Ruiz',
    subtitle: 'Product Lead en BlueWave',
    avatarUrl: '',
    companyId: 'co4',
    company: 'BlueWave',
    email: 'ana.ruiz@bluewave.io',
    phone: '+52 55 7821-4410',
    role: 'Product Lead',
    status: 'Proveedor',
    lastContactLabel: 'Hoy, 09:05 · WhatsApp',
  },
  {
    id: 'c5',
    name: 'Diego Méndez',
    subtitle: 'Gerente TI en Logistics Co',
    avatarUrl: '',
    companyId: 'co7',
    company: 'Logistics Co',
    email: 'dmendez@logisticsco.mx',
    phone: '+52 81 4400-2200',
    role: 'Gerente de tecnología',
    status: 'Prospecto',
    lastContactLabel: '10 may, 14:20 · Demo',
  },
  {
    id: 'c6',
    name: 'Laura Fernández',
    subtitle: 'CFO en FinNova',
    avatarUrl: '',
    companyId: 'co5',
    company: 'FinNova',
    email: 'laura.fernandez@finnova.com',
    phone: '+34 913 772 901',
    role: 'CFO',
    status: 'Prospecto',
    lastContactLabel: '8 may · Follow-up email',
  },
  {
    id: 'c7',
    name: 'Roberto Sánchez',
    subtitle: 'Director de operaciones en AgroSur',
    avatarUrl: '',
    companyId: 'co6',
    company: 'AgroSur',
    email: 'rsanchez@agrosur.com.ar',
    phone: '+54 376 522-9031',
    role: 'Director de operaciones',
    status: 'Cliente',
    lastContactLabel: '7 may, 11:00 · Llamada',
  },
  {
    id: 'c8',
    name: 'Valentina Torres',
    subtitle: 'Head of Sales en Urbana SaaS',
    avatarUrl: '',
    company: 'Urbana SaaS',
    email: 'valentina@urbanasaas.co',
    phone: '+57 310 884-6621',
    role: 'Head of Sales',
    status: 'Prospecto',
    lastContactLabel: '6 may · LinkedIn',
  },
  {
    id: 'c9',
    name: 'Federico Paz',
    subtitle: 'Founder en MedLab Digital',
    avatarUrl: '',
    companyId: 'co8',
    company: 'MedLab Digital',
    email: 'federico@medlabdigital.com',
    phone: '+54 11 2033-8844',
    role: 'Founder',
    status: 'Prospecto',
    lastContactLabel: '5 may, 09:40 · Videollamada',
  },
  {
    id: 'c10',
    name: 'Camila Herrera',
    subtitle: 'COO en ShopCore',
    avatarUrl: '',
    company: 'ShopCore',
    email: 'camila@shopcore.com',
    phone: '+56 9 8765 4321',
    role: 'COO',
    status: 'Cliente',
    lastContactLabel: '4 may · Email',
  },
]

export const contactListSeed: ContactListItem[] = ensureRecordAuditList(
  contactListSeedRaw,
  (c) => c.ownerName ?? 'María López',
)
