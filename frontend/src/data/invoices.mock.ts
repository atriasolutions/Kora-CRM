import type { RecordAuditFields } from '@/lib/record-audit'
import { ensureRecordAuditList } from '@/lib/seed-audit'

export type InvoiceStatus = 'Pagada' | 'Pendiente' | 'Vencida' | 'Borrador' | 'Anulada'
export type InvoicePaymentMethod =
  | 'Transferencia'
  | 'Tarjeta'
  | 'Cheque'
  | 'Efectivo'
  | 'Otro'

import type { SaleCustomerKind } from '@/lib/sale-customer'

export type InvoiceListItem = {
  id: string
  number: string
  client: string
  customerKind?: SaleCustomerKind
  contactId?: string
  contactName?: string
  companyId?: string
  companyName?: string
  amount: string
  amountNum: number
  issueDate: string
  dueDate: string
  status: InvoiceStatus
  owner: string
  quoteId?: string
  paymentMethod: InvoicePaymentMethod
  /** Folio del DTE en el SII (obligatorio al emitir). */
  siiNumber?: string
  /** Estado del DTE en integración SII. */
  dteStatus?: string
  /** Track ID devuelto por el SII al enviar el DTE. */
  siiTrackId?: string
} & RecordAuditFields

export const INVOICE_LIST_TOTAL_DEMO = 312

export const INVOICE_STATUS_OPTIONS: InvoiceStatus[] = [
  'Pagada',
  'Pendiente',
  'Vencida',
  'Borrador',
  'Anulada',
]

export const INVOICE_PAYMENT_METHOD_OPTIONS: InvoicePaymentMethod[] = [
  'Transferencia',
  'Tarjeta',
  'Cheque',
  'Efectivo',
  'Otro',
]

const companyIds: Record<string, string> = {
  'Tech Solutions': 'co1',
  'Nova Retail': 'co2',
  'Industrial Plus': 'co3',
  BlueWave: 'co4',
  FinNova: 'co5',
  AgroSur: 'co6',
  'Logistics Co': 'co7',
  'MedLab Digital': 'co8',
}

const invoiceListSeedRaw: Omit<InvoiceListItem, keyof RecordAuditFields>[] = [
  {
    id: 'inv1',
    number: 'FAC-2024-0842',
    client: 'Tech Solutions',
    customerKind: 'empresa',
    companyId: companyIds['Tech Solutions'],
    companyName: 'Tech Solutions',
    amount: '$12,400',
    amountNum: 12400,
    issueDate: '1 may 2024',
    dueDate: '15 may 2024',
    status: 'Pagada',
    owner: 'María López',
    quoteId: 'qt1',
    paymentMethod: 'Transferencia',
    siiNumber: '842156',
  },
  {
    id: 'inv2',
    number: 'FAC-2024-0851',
    client: 'Industrial Plus',
    companyId: companyIds['Industrial Plus'],
    amount: '$45,800',
    amountNum: 45800,
    issueDate: '5 may 2024',
    dueDate: '20 may 2024',
    status: 'Pendiente',
    owner: 'Carlos Vega',
    quoteId: 'qt3',
    paymentMethod: 'Transferencia',
    siiNumber: '851203',
  },
  {
    id: 'inv3',
    number: 'FAC-2024-0860',
    client: 'María González',
    customerKind: 'contacto',
    contactId: 'c2',
    contactName: 'María González',
    amount: '$8,200',
    amountNum: 8200,
    issueDate: '8 may 2024',
    dueDate: '22 may 2024',
    status: 'Pendiente',
    owner: 'Ana Ruiz',
    paymentMethod: 'Tarjeta',
  },
  {
    id: 'inv4',
    number: 'FAC-2024-0872',
    client: 'BlueWave',
    companyId: companyIds.BlueWave,
    amount: '$19,650',
    amountNum: 19650,
    issueDate: '10 may 2024',
    dueDate: '10 may 2024',
    status: 'Vencida',
    owner: 'María López',
    quoteId: 'qt4',
    paymentMethod: 'Transferencia',
  },
  {
    id: 'inv5',
    number: 'FAC-2024-0880',
    client: 'AgroSur',
    companyId: companyIds.AgroSur,
    amount: '$32,100',
    amountNum: 32100,
    issueDate: '12 may 2024',
    dueDate: '26 may 2024',
    status: 'Pagada',
    owner: 'Laura Fernández',
    quoteId: 'qt8',
    paymentMethod: 'Cheque',
  },
  {
    id: 'inv6',
    number: 'FAC-2024-0888',
    client: 'Logistics Co',
    companyId: companyIds['Logistics Co'],
    amount: '$67,000',
    amountNum: 67000,
    issueDate: '14 may 2024',
    dueDate: '28 may 2024',
    status: 'Pendiente',
    owner: 'Roberto Sánchez',
    quoteId: 'qt6',
    paymentMethod: 'Transferencia',
  },
  {
    id: 'inv7',
    number: 'FAC-2024-0895',
    client: 'MedLab Digital',
    companyId: companyIds['MedLab Digital'],
    amount: '$5,400',
    amountNum: 5400,
    issueDate: '16 may 2024',
    dueDate: '30 may 2024',
    status: 'Borrador',
    owner: 'Valentina Torres',
    paymentMethod: 'Otro',
  },
  {
    id: 'inv8',
    number: 'FAC-2024-0901',
    client: 'FinNova',
    companyId: companyIds.FinNova,
    amount: '$28,900',
    amountNum: 28900,
    issueDate: '18 may 2024',
    dueDate: '1 jun 2024',
    status: 'Pendiente',
    owner: 'Diego Méndez',
    quoteId: 'qt10',
    paymentMethod: 'Transferencia',
  },
]

export const invoiceListSeed: InvoiceListItem[] = ensureRecordAuditList(
  invoiceListSeedRaw,
  (x) => x.owner,
)
