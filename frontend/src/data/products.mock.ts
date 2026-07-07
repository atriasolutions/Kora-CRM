import type { RecordAuditFields } from '@/lib/record-audit'
import { ensureRecordAuditList } from '@/lib/seed-audit'

import type { ProductType } from '@/lib/product-catalog'
import type { BillingPeriod } from '@/lib/product-catalog'

export type ProductStatus = 'Activo' | 'Agotado' | 'Borrador'

export type ProductListItem = {
  id: string
  name: string
  sku: string
  category: string
  productType: ProductType
  unitOfMeasure: string
  billingPeriod?: BillingPeriod
  customUnit?: string
  price: string
  priceNum: number
  priceCurrency?: import('@/lib/currency').ProductCurrency
  costPrice: string
  costPriceNum: number
  stock: string
  stockNum: number
  status: ProductStatus
  /** Responsable interno del producto en catálogo */
  owner: string
  trackInventory?: boolean
  minStockNum?: number
  maxStockNum?: number
  imageUrl?: string
  barcode?: string
  description?: string
  brand?: string
  publishInIntegration?: boolean
  publishPriceInIntegration?: boolean
} & RecordAuditFields

export const PRODUCT_LIST_TOTAL_DEMO = 56

export const PRODUCT_STATUS_OPTIONS: ProductStatus[] = ['Activo', 'Agotado', 'Borrador']

/** @deprecated Usar PRODUCT_CATEGORY_OPTIONS de @/lib/product-catalog */
export const PRODUCT_CATEGORY_OPTIONS = [
  'Software',
  'Suscripciones',
  'Servicios',
  'Add-ons',
] as const

const productListSeedRaw: Omit<ProductListItem, keyof RecordAuditFields>[] = [
  {
    id: 'prod1',
    name: 'Plan Starter',
    sku: 'PLN-STR-01',
    category: 'Suscripciones',
    productType: 'Suscripción',
    unitOfMeasure: 'mes',
    price: '$49/mes',
    priceNum: 49,
    costPrice: '$12/mes',
    costPriceNum: 12,
    stock: '—',
    stockNum: -1,
    status: 'Activo',
    owner: 'María López',
  },
  {
    id: 'prod2',
    name: 'Plan Business',
    sku: 'PLN-BUS-01',
    category: 'Suscripciones',
    productType: 'Suscripción',
    unitOfMeasure: 'mes',
    price: '$149/mes',
    priceNum: 149,
    costPrice: '$35/mes',
    costPriceNum: 35,
    stock: '—',
    stockNum: -1,
    status: 'Activo',
    owner: 'Carlos Vega',
  },
  {
    id: 'prod3',
    name: 'Plan Enterprise',
    sku: 'PLN-ENT-01',
    category: 'Software',
    productType: 'Servicio',
    unitOfMeasure: 'licencia',
    price: 'A medida',
    priceNum: 0,
    costPrice: '—',
    costPriceNum: 0,
    stock: '—',
    stockNum: -1,
    status: 'Activo',
    owner: 'Ana Ruiz',
  },
  {
    id: 'prod4',
    name: 'Onboarding dedicado',
    sku: 'SRV-ONB-01',
    category: 'Servicios',
    productType: 'Servicio',
    unitOfMeasure: 'hora',
    price: '$2,400',
    priceNum: 2400,
    costPrice: '$1,200',
    costPriceNum: 1200,
    stock: '12 cupos',
    stockNum: 12,
    status: 'Activo',
    owner: 'Roberto Sánchez',
  },
  {
    id: 'prod5',
    name: 'Horas consultoría',
    sku: 'SRV-CON-10',
    category: 'Servicios',
    productType: 'Servicio',
    unitOfMeasure: 'hora',
    price: '$180/h',
    priceNum: 180,
    costPrice: '$90/h',
    costPriceNum: 90,
    stock: '0 h',
    stockNum: 0,
    status: 'Agotado',
    owner: 'Laura Fernández',
  },
  {
    id: 'prod6',
    name: 'Módulo BI avanzado',
    sku: 'ADD-BI-01',
    category: 'Add-ons',
    productType: 'Digital',
    unitOfMeasure: 'mes',
    price: '$89/mes',
    priceNum: 89,
    costPrice: '$18/mes',
    costPriceNum: 18,
    stock: '—',
    stockNum: -1,
    status: 'Activo',
    owner: 'María López',
  },
  {
    id: 'prod7',
    name: 'API premium',
    sku: 'ADD-API-01',
    category: 'Add-ons',
    productType: 'Digital',
    unitOfMeasure: 'mes',
    price: '$59/mes',
    priceNum: 59,
    costPrice: '$8/mes',
    costPriceNum: 8,
    stock: '—',
    stockNum: -1,
    status: 'Borrador',
    owner: 'Carlos Vega',
  },
  {
    id: 'prod8',
    name: 'Soporte 24/7',
    sku: 'SRV-SUP-24',
    category: 'Servicios',
    productType: 'Servicio',
    unitOfMeasure: 'mes',
    price: '$399/mes',
    priceNum: 399,
    costPrice: '$120/mes',
    costPriceNum: 120,
    stock: '8 cupos',
    stockNum: 8,
    status: 'Activo',
    owner: 'Ana Ruiz',
  },
  {
    id: 'prod9',
    name: 'Clavo acero 2" caja x100',
    sku: 'FER-CLV-2IN',
    category: 'Hardware / ferretería',
    productType: 'Físico',
    unitOfMeasure: 'caja',
    price: '$4,990',
    priceNum: 4990,
    costPrice: '$2,800',
    costPriceNum: 2800,
    stock: '84 cajas',
    stockNum: 84,
    status: 'Activo',
    barcode: '7801234567890',
    owner: 'Roberto Sánchez',
  },
  {
    id: 'prod10',
    name: 'Entraña vacuno premium',
    sku: 'CAR-ENT-01',
    category: 'Cárnicos',
    productType: 'Físico',
    unitOfMeasure: 'kg',
    price: '$12,990/kg',
    priceNum: 12990,
    costPrice: '$8,200/kg',
    costPriceNum: 8200,
    stock: '24 kg',
    stockNum: 24,
    status: 'Activo',
    barcode: '2400100001234',
    owner: 'Laura Fernández',
  },
  {
    id: 'prod11',
    name: 'Aceite motor 5W-30 4L',
    sku: 'FER-ACE-5W30',
    category: 'Hardware / ferretería',
    productType: 'Físico',
    unitOfMeasure: 'unidad',
    price: '$24,500',
    priceNum: 24500,
    costPrice: '$16,800',
    costPriceNum: 16800,
    stock: '36 u.',
    stockNum: 36,
    status: 'Activo',
    owner: 'María López',
  },
]

export const productListSeed: ProductListItem[] = ensureRecordAuditList(
  productListSeedRaw,
  (x) => x.owner,
)
