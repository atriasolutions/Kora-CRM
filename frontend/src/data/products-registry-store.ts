import type { ProductListItem } from '@/data/products.mock'

let registryUserProducts: ProductListItem[] = []

export function syncRegistryProducts(items: ProductListItem[]) {
  registryUserProducts = items
}

export function getRegistryProducts(): ProductListItem[] {
  return registryUserProducts
}

export function getRegistryProductById(id: string): ProductListItem | undefined {
  return registryUserProducts.find((p) => p.id === id)
}
