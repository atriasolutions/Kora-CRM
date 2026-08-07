import type { RecordAuditFields } from '@/lib/record-audit'
import { ensureRecordAuditList } from '@/lib/seed-audit'
import type { ContactActivity, ContactNote } from '@/data/contact-detail.mock'
import type { EntityFileRecord } from '@/lib/entity-files'
import { getRegistryExpenseById } from '@/data/expenses-registry-store'

export const EXPENSE_CATEGORIES = [
  'Impuestos',
  'Arriendo',
  'Servicios',
  'Software',
  'Equipos',
  'Salarios',
  'Retiros',
  'Marketing',
  'Transporte',
  'Seguros',
  'Mantención',
  'Otros',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export type ExpenseStatus = 'Borrador' | 'Registrado' | 'Anulado'

export type ExpensePaymentMethod =
  | 'Transferencia'
  | 'Tarjeta'
  | 'Cheque'
  | 'Efectivo'
  | 'Crédito'
  | 'Otro'

export type ExpenseListItem = {
  id: string
  number: string
  concept: string
  category: ExpenseCategory | string
  expenseDate: string
  /** yyyy-mm-dd — preferido para orden/filtros de fecha. */
  expenseDateIso?: string
  amount: string
  amountNum: number
  currency: string
  paymentMethod: ExpensePaymentMethod | string
  status: ExpenseStatus
  supplierId?: string
  supplierName?: string
  owner: string
  notes?: string
  receiptUrls: string[]
  isPartnerLoan: boolean
  partnerUserId?: string
  partnerName?: string
  partnerLoanReturned: boolean
} & RecordAuditFields

export type ExpenseDetail = Omit<ExpenseListItem, 'notes'> & {
  internalNotes: string
  activities: ContactActivity[]
  notes: ContactNote[]
  files: EntityFileRecord[]
}

export const EXPENSE_STATUS_OPTIONS: ExpenseStatus[] = [
  'Borrador',
  'Registrado',
  'Anulado',
]

export const EXPENSE_PAYMENT_METHOD_OPTIONS: ExpensePaymentMethod[] = [
  'Transferencia',
  'Tarjeta',
  'Cheque',
  'Efectivo',
  'Crédito',
  'Otro',
]

export const EXPENSE_CATEGORY_OPTIONS: ExpenseCategory[] = [...EXPENSE_CATEGORIES]

const expenseListSeedRaw: Omit<ExpenseListItem, keyof RecordAuditFields>[] = [
  {
    id: 'gas1',
    number: 'GAS-2024-0001',
    concept: 'Arriendo oficina julio',
    category: 'Arriendo',
    expenseDate: '1 jul 2024',
    amount: '$1.200.000',
    amountNum: 1200000,
    currency: 'CLP',
    paymentMethod: 'Transferencia',
    status: 'Registrado',
    supplierName: 'Inmobiliaria Centro',
    owner: 'Ana Ruiz',
    receiptUrls: [],
    isPartnerLoan: false,
    partnerLoanReturned: false,
  },
  {
    id: 'gas2',
    number: 'GAS-2024-0002',
    concept: 'Suscripción CRM',
    category: 'Software',
    expenseDate: '5 jul 2024',
    amount: '$89.000',
    amountNum: 89000,
    currency: 'CLP',
    paymentMethod: 'Tarjeta',
    status: 'Registrado',
    owner: 'María López',
    receiptUrls: [],
    isPartnerLoan: false,
    partnerLoanReturned: false,
  },
  {
    id: 'gas3',
    number: 'GAS-2024-0003',
    concept: 'IVA retenido',
    category: 'Impuestos',
    expenseDate: '10 jul 2024',
    amount: '$450.000',
    amountNum: 450000,
    currency: 'CLP',
    paymentMethod: 'Transferencia',
    status: 'Borrador',
    owner: 'Carlos Vega',
    receiptUrls: [],
    isPartnerLoan: false,
    partnerLoanReturned: false,
  },
]

export const expenseListSeed: ExpenseListItem[] = ensureRecordAuditList(
  expenseListSeedRaw,
  (x) => x.owner,
)

export function resolveExpenseListItem(id: string): ExpenseListItem {
  const fromRegistry = getRegistryExpenseById(id)
  if (fromRegistry) return { ...fromRegistry, id }
  const seed = expenseListSeed.find((row) => row.id === id)
  if (seed) return { ...seed }
  return {
    id,
    number: '—',
    concept: 'Gasto',
    category: 'Otros',
    expenseDate: '—',
    amount: '$0',
    amountNum: 0,
    currency: 'CLP',
    paymentMethod: 'Transferencia',
    status: 'Borrador',
    owner: '—',
    receiptUrls: [],
    isPartnerLoan: false,
    partnerLoanReturned: false,
    createdAt: '',
    createdById: '',
    createdByName: '—',
    updatedAt: '',
    updatedById: '',
    updatedByName: '—',
  }
}

export function getExpenseDetail(id: string): ExpenseDetail {
  const list = resolveExpenseListItem(id)
  const { notes: listNotes, ...rest } = list
  return {
    ...rest,
    internalNotes: listNotes ?? '',
    activities: [],
    notes: [],
    files: [],
  }
}
