import type { RecordAuditFields } from '@/lib/record-audit'
import { ensureRecordAuditList } from '@/lib/seed-audit'

export type BoletaStatus = 'Borrador' | 'Emitida' | 'Anulada'

export type BoletaPaymentMethod =
  | 'Transferencia'
  | 'Tarjeta'
  | 'Cheque'
  | 'Efectivo'
  | 'Crédito'
  | 'Otro'

export type BoletaListItem = {
  id: string
  number: string
  buyerName: string
  buyerTaxId?: string
  contactId?: string
  contactName?: string
  companyId?: string
  companyName?: string
  amount: string
  amountNum: number
  issueDate: string
  status: BoletaStatus
  owner: string
  paymentMethod: BoletaPaymentMethod
  taxableAmount?: string
  exemptAmount?: string
  taxAmount?: string
  notes?: string
  printedAt?: string
} & RecordAuditFields

export const BOLETA_LIST_TOTAL_DEMO = 128

export const BOLETA_STATUS_OPTIONS: BoletaStatus[] = ['Borrador', 'Emitida', 'Anulada']

export const BOLETA_PAYMENT_METHOD_OPTIONS: BoletaPaymentMethod[] = [
  'Transferencia',
  'Tarjeta',
  'Cheque',
  'Efectivo',
  'Crédito',
  'Otro',
]

const companyIds: Record<string, string> = {
  'Tech Solutions': 'co1',
  'Nova Retail': 'co2',
  'Industrial Plus': 'co3',
  BlueWave: 'co4',
  FinNova: 'co5',
}

const boletaListSeedRaw: Omit<BoletaListItem, keyof RecordAuditFields>[] = [
  {
    id: 'bol1',
    number: 'BOL-2024-1201',
    buyerName: 'María González',
    buyerTaxId: '12.345.678-9',
    contactId: 'c2',
    contactName: 'María González',
    amount: '$8,200',
    amountNum: 8200,
    issueDate: '3 may 2024',
    status: 'Emitida',
    owner: 'Ana Ruiz',
    paymentMethod: 'Efectivo',
  },
  {
    id: 'bol2',
    number: 'BOL-2024-1208',
    buyerName: 'Tech Solutions',
    companyId: companyIds['Tech Solutions'],
    companyName: 'Tech Solutions',
    amount: '$15,400',
    amountNum: 15400,
    issueDate: '6 may 2024',
    status: 'Emitida',
    owner: 'María López',
    paymentMethod: 'Transferencia',
  },
  {
    id: 'bol3',
    number: 'BOL-2024-1215',
    buyerName: 'Consumidor final',
    amount: '$3,250',
    amountNum: 3250,
    issueDate: '9 may 2024',
    status: 'Borrador',
    owner: 'Carlos Vega',
    paymentMethod: 'Tarjeta',
  },
  {
    id: 'bol4',
    number: 'BOL-2024-1220',
    buyerName: 'BlueWave',
    companyId: companyIds.BlueWave,
    companyName: 'BlueWave',
    amount: '$9,800',
    amountNum: 9800,
    issueDate: '11 may 2024',
    status: 'Anulada',
    owner: 'María López',
    paymentMethod: 'Efectivo',
  },
  {
    id: 'bol5',
    number: 'BOL-2024-1228',
    buyerName: 'FinNova',
    companyId: companyIds.FinNova,
    companyName: 'FinNova',
    amount: '$22,100',
    amountNum: 22100,
    issueDate: '14 may 2024',
    status: 'Emitida',
    owner: 'Diego Méndez',
    paymentMethod: 'Transferencia',
  },
]

export const boletaListSeed: BoletaListItem[] = ensureRecordAuditList(
  boletaListSeedRaw,
  (x) => x.owner,
)
