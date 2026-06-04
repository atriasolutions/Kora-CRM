import type { RecordAuditFields } from '@/lib/record-audit'
import { ensureRecordAuditList } from '@/lib/seed-audit'
import type { SaleCustomerKind } from '@/lib/sale-customer'
import type { QuoteStatus } from '@/lib/quote-journey'

export type { QuoteStatus }

export type QuoteListItem = {
  id: string
  code: string
  title: string
  opportunityId: string
  opportunityName: string
  companyName: string
  amount: string
  status: QuoteStatus
  validUntil: string
  /** Fecha del documento (negocio). */
  issueDate: string
  owner: string
  /** Cliente B2C o B2B */
  customerKind?: SaleCustomerKind
  contactId?: string
  companyId?: string
} & RecordAuditFields

export const QUOTE_LIST_TOTAL_DEMO = 64

/** Cotizaciones demo: cada una pertenece a una oportunidad (0..N por oportunidad). */
const quoteListSeedRaw: Omit<QuoteListItem, keyof RecordAuditFields>[] = [
  {
    id: 'qt1',
    code: 'COT-2024-0142',
    title: 'Licencias cloud — plan anual',
    opportunityId: 'op1',
    opportunityName: 'Expansión cloud',
    companyName: 'Tech Solutions',
    amount: '$55,400',
    status: 'Aceptada',
    validUntil: '30 jun 2024',
    issueDate: '12 may 2024',
    owner: 'María López',
  },
  {
    id: 'qt2',
    code: 'COT-2024-0148',
    title: 'Expansión cloud — alternativa trimestral',
    opportunityId: 'op1',
    opportunityName: 'Expansión cloud',
    companyName: 'Tech Solutions',
    amount: '$14,200',
    status: 'En revisión interna',
    validUntil: '15 jul 2024',
    issueDate: '18 may 2024',
    owner: 'María López',
  },
  {
    id: 'qt3',
    code: 'COT-2024-0091',
    title: 'ERP renovación + soporte',
    opportunityId: 'op2',
    opportunityName: 'Renovación anual ERP',
    companyName: 'Industrial Plus',
    amount: '$128,900',
    status: 'Enviada',
    validUntil: '15 jul 2024',
    issueDate: '3 may 2024',
    owner: 'Carlos Vega',
  },
  {
    id: 'qt4',
    code: 'COT-2024-0110',
    title: 'Integración Shopify — fase 1',
    opportunityId: 'op4',
    opportunityName: 'Integración Shopify',
    companyName: 'BlueWave',
    amount: '$32,650',
    status: 'En negociación',
    validUntil: '10 jun 2024',
    issueDate: '28 abr 2024',
    owner: 'María López',
  },
  {
    id: 'qt5',
    code: 'COT-2024-0111',
    title: 'Integración Shopify — mantenimiento',
    opportunityId: 'op4',
    opportunityName: 'Integración Shopify',
    companyName: 'BlueWave',
    amount: '$4,800',
    status: 'Borrador',
    validUntil: '10 jul 2024',
    issueDate: '2 may 2024',
    owner: 'María López',
  },
  {
    id: 'qt6',
    code: 'COT-2024-0203',
    title: 'Licencias enterprise — 500 usuarios',
    opportunityId: 'op5',
    opportunityName: 'Licencias enterprise',
    companyName: 'Logistics Co',
    amount: '$210,000',
    status: 'En espera cliente',
    validUntil: '5 jul 2024',
    issueDate: '20 may 2024',
    owner: 'Roberto Sánchez',
  },
  {
    id: 'qt7',
    code: 'COT-2024-0204',
    title: 'Licencias enterprise — add-on BI',
    opportunityId: 'op5',
    opportunityName: 'Licencias enterprise',
    companyName: 'Logistics Co',
    amount: '$38,000',
    status: 'Borrador',
    validUntil: '20 jul 2024',
    issueDate: '22 may 2024',
    owner: 'Roberto Sánchez',
  },
  {
    id: 'qt8',
    code: 'COT-2024-0077',
    title: 'Soporte premium anual',
    opportunityId: 'op7',
    opportunityName: 'Soporte premium',
    companyName: 'AgroSur',
    amount: '$42,000',
    status: 'Aceptada',
    validUntil: '2 may 2024',
    issueDate: '10 abr 2024',
    owner: 'Laura Fernández',
  },
  {
    id: 'qt9',
    code: 'COT-2024-0135',
    title: 'Migración datos — alcance inicial',
    opportunityId: 'op8',
    opportunityName: 'Migración datos',
    companyName: 'FinNova',
    amount: '$67,500',
    status: 'Rechazada',
    validUntil: '18 jun 2024',
    issueDate: '5 may 2024',
    owner: 'Diego Méndez',
  },
  {
    id: 'qt10',
    code: 'COT-2024-0136',
    title: 'Migración datos — revisión v2',
    opportunityId: 'op8',
    opportunityName: 'Migración datos',
    companyName: 'FinNova',
    amount: '$59,200',
    status: 'Cancelada',
    validUntil: '30 jun 2024',
    issueDate: '16 may 2024',
    owner: 'Diego Méndez',
  },
]

export const quoteListSeed: QuoteListItem[] = ensureRecordAuditList(
  quoteListSeedRaw,
  (q) => q.owner,
  (q) => q.issueDate,
)
