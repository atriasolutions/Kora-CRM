import type { RecordAuditFields } from '@/lib/record-audit'
import { ensureRecordAuditList } from '@/lib/seed-audit'

export type InventoryStatus =
  | 'En tránsito'
  | 'En stock'
  | 'Stock bajo'
  | 'Quiebre de stock'
  | 'Sin stock'
  | 'Reservado'

export type InventoryListItem = {
  id: string
  productName: string
  sku: string
  location: string
  quantity: string
  quantityNum: number
  /** Calculado por motor de stock (opcional en seed). */
  reservedQtyNum?: number
  availableQtyNum?: number
  onHandQtyNum?: number
  minStock: string
  minStockNum: number
  status: InventoryStatus
  lastMovement: string
} & RecordAuditFields

export const INVENTORY_LIST_TOTAL_DEMO = 64

export const INVENTORY_STATUS_OPTIONS: InventoryStatus[] = [
  'En stock',
  'Stock bajo',
  'Quiebre de stock',
  'Sin stock',
  'Reservado',
  'En tránsito',
]

export const INVENTORY_LOCATION_OPTIONS = [
  'Bodega central',
  'Sucursal norte',
  'Sucursal sur',
  'Tránsito',
] as const

const inventoryListSeedRaw: Omit<InventoryListItem, keyof RecordAuditFields>[] = [
  {
    id: 'inv1',
    productName: 'Plan Business',
    sku: 'PLN-BUS-01',
    location: 'Bodega central',
    quantity: '240 u.',
    quantityNum: 240,
    minStock: '50 u.',
    minStockNum: 50,
    status: 'En stock',
    lastMovement: 'Hoy · Entrada OC-0182',
  },
  {
    id: 'inv1-norte',
    productName: 'Plan Business',
    sku: 'PLN-BUS-01',
    location: 'Sucursal norte',
    quantity: '60 u.',
    quantityNum: 60,
    minStock: '20 u.',
    minStockNum: 20,
    status: 'En stock',
    lastMovement: 'Ayer · Transferencia interna',
  },
  {
    id: 'inv2',
    productName: 'Onboarding dedicado',
    sku: 'SRV-ONB-01',
    location: 'Bodega central',
    quantity: '8 cupos',
    quantityNum: 8,
    minStock: '12 cupos',
    minStockNum: 12,
    status: 'Stock bajo',
    lastMovement: 'Ayer · Salida proyecto',
  },
  {
    id: 'inv3',
    productName: 'Horas consultoría',
    sku: 'SRV-CON-10',
    location: 'Sucursal norte',
    quantity: '0 h',
    quantityNum: 0,
    minStock: '20 h',
    minStockNum: 20,
    status: 'Sin stock',
    lastMovement: '12 may · Ajuste inventario',
  },
  {
    id: 'inv4',
    productName: 'Módulo BI avanzado',
    sku: 'ADD-BI-01',
    location: 'Bodega central',
    quantity: '56 lic.',
    quantityNum: 56,
    minStock: '30 lic.',
    minStockNum: 30,
    status: 'En stock',
    lastMovement: '15 may · Entrada compra',
  },
  {
    id: 'inv5',
    productName: 'Plan Starter',
    sku: 'PLN-STR-01',
    location: 'Tránsito',
    quantity: '120 u.',
    quantityNum: 120,
    minStock: '40 u.',
    minStockNum: 40,
    status: 'En tránsito',
    lastMovement: '16 may · Reserva pedido',
  },
  {
    id: 'inv6',
    productName: 'API Gateway pack',
    sku: 'ADD-API-01',
    location: 'Sucursal sur',
    quantity: '18 u.',
    quantityNum: 18,
    minStock: '25 u.',
    minStockNum: 25,
    status: 'Stock bajo',
    lastMovement: '10 may · Salida demo',
  },
]

export const inventoryListSeed: InventoryListItem[] = ensureRecordAuditList(
  inventoryListSeedRaw,
  () => 'María López',
)
