import type {
  ProductVariantKind,
  VariantAttributes,
  VariantOption,
} from '../lib/product-variants.js'

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
  parentProductId?: string
  parentName?: string
  parentSku?: string
  variantOptions?: VariantOption[]
  variantAttributes?: VariantAttributes
  variantKind: ProductVariantKind
  variantsCount: number
  variants?: ProductListItem[]
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
  parentProductId?: string | null
  variantOptions?: VariantOption[]
  variantAttributes?: VariantAttributes
}

export type UpdateProductInput = Partial<CreateProductInput>

export type CreateVariantsBatchInput = {
  options?: VariantOption[]
  variants?: {
    sku?: string
    attributes: VariantAttributes
    priceNum?: number
    costPriceNum?: number
    stockNum?: number
    status?: ProductStatus
    trackInventory?: boolean
  }[]
}

export type ConvertToParentInput = {
  options: VariantOption[]
  firstVariantAttributes: VariantAttributes
  firstVariantSku?: string
  firstVariantName?: string
}
