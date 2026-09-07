import type { RecordAuditFields } from '@/lib/record-audit'
import { ensureRecordAuditList } from '@/lib/seed-audit'

export type PurchaseStatus = 'Borrador' | 'Emitida' | 'Confirmada'
export type PurchasePaymentStatus = 'Pendiente' | 'Pagada'

export type PurchaseListItem = {
  id: string
  reference: string
  supplier: string
  supplierId?: string
  productSummary: string
  orderDate: string
  amount: string
  amountNum: number
  status: PurchaseStatus
  paymentStatus?: PurchasePaymentStatus
  paidAt?: string
  owner: string
} & RecordAuditFields

export const PURCHASE_LIST_TOTAL_DEMO = 42

export const PURCHASE_STATUS_OPTIONS: PurchaseStatus[] = [
  'Borrador',
  'Emitida',
  'Confirmada',
]

export const PURCHASE_PAYMENT_STATUS_OPTIONS: PurchasePaymentStatus[] = [
  'Pendiente',
  'Pagada',
]

const purchaseListSeedRaw: Omit<PurchaseListItem, keyof RecordAuditFields>[] = [
  {
    id: 'pur1',
    reference: 'OC-2024-0182',
    supplier: 'BlueWave',
    supplierId: 'co4',
    productSummary: 'Licencias SaaS x50 · Módulo BI',
    orderDate: '16 may 2024',
    amount: '$12,400',
    amountNum: 12400,
    status: 'Emitida',
    owner: 'María López',
  },
  {
    id: 'pur2',
    reference: 'OC-2024-0175',
    supplier: 'Logistics Co',
    supplierId: 'co7',
    productSummary: 'Servidores edge · Instalación',
    orderDate: '14 may 2024',
    amount: '$28,900',
    amountNum: 28900,
    status: 'Confirmada',
    owner: 'Carlos Vega',
  },
  {
    id: 'pur3',
    reference: 'OC-2024-0160',
    supplier: 'Industrial Plus',
    supplierId: 'co3',
    productSummary: 'Consultoría onboarding 40h',
    orderDate: '10 may 2024',
    amount: '$7,200',
    amountNum: 7200,
    status: 'Confirmada',
    owner: 'Ana Ruiz',
  },
  {
    id: 'pur4',
    reference: 'OC-2024-0144',
    supplier: 'Nova Retail',
    supplierId: 'co2',
    productSummary: 'Hardware POS · 12 unidades',
    orderDate: '3 may 2024',
    amount: '$4,560',
    amountNum: 4560,
    status: 'Borrador',
    owner: 'María López',
  },
]

export const purchaseListSeed: PurchaseListItem[] = ensureRecordAuditList(
  purchaseListSeedRaw,
  (x) => x.owner,
)
