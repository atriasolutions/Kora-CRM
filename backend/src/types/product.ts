export type ProductStatus = 'Activo' | 'Agotado' | 'Borrador'

export type ProductListItem = {
  id: string
  name: string
  sku: string
  category: string
  subcategory?: string
  categoryId?: string
  subcategoryId?: string
  rootCategoryId?: string
  productType: string
  unitOfMeasure: string
  billingPeriod?: string
  price: string
  priceNum: number
  priceCurrency: import('./currency.js').ProductCurrency
  costPrice: string
  costPriceNum: number
  stock: string
  stockNum: number
  status: ProductStatus
  trackInventory: boolean
  minStockNum: number
  maxStockNum: number
  owner: string
  imageUrl?: string
  barcode?: string
  description?: string
  brand?: string
  publishInIntegration: boolean
  publishPriceInIntegration: boolean
  createdAt: string
  createdById: string
  createdByName: string
  updatedAt: string
  updatedById: string
  updatedByName: string
}

export type CreateProductInput = {
  name: string
  sku: string
  ownerName?: string
  category?: string
  subcategory?: string
  productType?: string
  unitOfMeasure?: string
  billingPeriod?: string
  priceNum?: number
  priceCurrency?: import('./currency.js').ProductCurrency
  costPriceNum?: number
  stockNum?: number
  status?: ProductStatus
  imageUrl?: string
  barcode?: string
  description?: string
  brand?: string
  publishInIntegration?: boolean
  publishPriceInIntegration?: boolean
  trackInventory?: boolean
  minStock?: number
  maxStock?: number
}

export type UpdateProductInput = Partial<CreateProductInput>
