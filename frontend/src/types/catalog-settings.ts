export type WarehouseSetting = {
  id: string
  name: string
  code: string
  address: string
  region: string
  commune: string
  isDefault: boolean
  active: boolean
}

export type ProductCategorySetting = {
  id: string
  name: string
  active: boolean
  parentId?: string | null
}

export type CatalogSettings = {
  warehouses: WarehouseSetting[]
  productCategories: ProductCategorySetting[]
}
