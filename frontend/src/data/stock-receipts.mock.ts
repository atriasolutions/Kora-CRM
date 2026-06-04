import type { RecordAuditFields } from '@/lib/record-audit'
import { ensureRecordAuditList } from '@/lib/seed-audit'

export type StockReceiptStatus = 'Borrador' | 'Confirmado'

export type StockReceiptListItem = {
  id: string
  number: string
  status: StockReceiptStatus
  /** Referencia externa (factura proveedor, etc.) */
  externalReference: string
  purchaseId?: string
  purchaseReference?: string
  supplier?: string
  warehouse: string
  productSummary: string
  lineCount: number
  createdAt: string
  confirmedAt?: string
  owner: string
} & RecordAuditFields

export const STOCK_RECEIPT_LIST_TOTAL_DEMO = 18

type StockReceiptListItemSeed = Omit<StockReceiptListItem, keyof RecordAuditFields> & {
  seedDate?: string
}

const stockReceiptListSeedRaw: StockReceiptListItemSeed[] = [
  {
    id: 'sr1',
    number: 'ING-2024-0012',
    status: 'Confirmado',
    externalReference: 'Factura BlueWave #8821',
    purchaseId: 'pur1',
    purchaseReference: 'OC-2024-0182',
    supplier: 'BlueWave',
    warehouse: 'Bodega central',
    productSummary: 'LIC-SAAS-50 · MOD-BI',
    lineCount: 2,
    seedDate: '18 may 2024',
    confirmedAt: '18 may 2024',
    owner: 'María López',
  },
  {
    id: 'sr2',
    number: 'ING-2024-0011',
    status: 'Borrador',
    externalReference: 'Recepción sin OC',
    warehouse: 'Bodega norte',
    productSummary: 'SRV-CONSULT',
    lineCount: 1,
    seedDate: '17 may 2024',
    owner: 'Carlos Ruiz',
  },
]

export const stockReceiptListSeed: StockReceiptListItem[] = ensureRecordAuditList(
  stockReceiptListSeedRaw,
  (x) => x.owner,
  (x) => x.seedDate,
)
