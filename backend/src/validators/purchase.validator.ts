import { z } from 'zod'

const purchaseLineSchema = z.object({
  id: z.string().optional(),
  productId: z.string().uuid().optional(),
  product: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  quantityReceived: z.number().min(0).optional(),
  unitPrice: z.string().optional(),
  unitPriceOriginal: z.coerce.number().optional(),
  priceCurrency: z.string().max(8).optional(),
  discount: z.string().max(16).optional(),
  total: z.string().optional(),
})

export const listPurchasesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().optional(),
  status: z.string().optional(),
  archived: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
})

const purchaseStatusSchema = z.enum(['Borrador', 'Emitida', 'Confirmada'])

const purchaseDetailFieldsSchema = z.object({
  description: z.string().max(10000).optional(),
  expectedDelivery: z.string().max(64).optional(),
  paymentTerms: z.string().max(255).optional(),
  warehouseId: z.string().uuid().optional(),
  warehouse: z.string().max(255).optional(),
  deliveryAddress: z.string().max(2000).optional(),
  supplierContactId: z.string().uuid().optional(),
  supplierContact: z.string().max(255).optional(),
  supplierEmail: z.string().max(255).optional(),
  supplierPhone: z.string().max(64).optional(),
})

export const createPurchaseSchema = purchaseDetailFieldsSchema.extend({
  reference: z.string().max(64).optional(),
  supplierId: z.string().uuid().optional(),
  supplier: z.string().optional(),
  productSummary: z.string().optional(),
  orderDate: z.string().optional(),
  amount: z.string().optional(),
  amountNum: z.number().optional(),
  amountCents: z.number().optional(),
  status: purchaseStatusSchema.optional(),
  ownerName: z.string().optional(),
  lineItems: z.array(purchaseLineSchema).optional(),
})

export const updatePurchaseSchema = createPurchaseSchema.partial()
