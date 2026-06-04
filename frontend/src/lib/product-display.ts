import type { ProductStatus } from '@/data/products.mock'

export function productStatusVariant(
  status: ProductStatus,
): 'customer' | 'destructive' | 'muted' {
  switch (status) {
    case 'Activo':
      return 'customer'
    case 'Agotado':
      return 'destructive'
    case 'Borrador':
    default:
      return 'muted'
  }
}

export { parseMoneyNum as parsePriceNum } from '@/lib/product-pricing'

export function parseStockNum(stock: string): number {
  if (stock.trim() === '—' || stock.trim() === '-') return -1
  return Number.parseInt(stock.replace(/[^\d]/g, ''), 10) || 0
}

export function formatStockDisplay(stockNum: number, stock: string): string {
  if (stock.trim()) return stock
  return stockNum < 0 ? '—' : String(stockNum)
}

/** Valor limpio para inputs enteros de stock (sin «—», «10 u.», etc.). */
export function inventoryQuantityInputValue(
  value: string,
  trackInventory: boolean,
): string {
  if (!trackInventory) return value
  const n = parseStockNum(value)
  return n < 0 ? '' : String(n)
}
