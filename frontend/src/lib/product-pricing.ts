import { formatAmountCLP, parseAmountCLP } from '@/lib/form-input-format'

export function parseMoneyNum(value: string): number {
  return parseAmountCLP(value)
}

export function formatMoneyCLP(amount: number): string {
  return formatAmountCLP(amount)
}

export function computeMarginPercent(costNum: number, saleNum: number): number {
  if (saleNum <= 0) return 0
  if (costNum <= 0) return 100
  return Math.round(((saleNum - costNum) / saleNum) * 100)
}

export function computeMarkupPercent(costNum: number, saleNum: number): number {
  if (costNum <= 0) return saleNum > 0 ? 100 : 0
  return Math.round(((saleNum - costNum) / costNum) * 100)
}

export function formatMarginLabel(costNum: number, saleNum: number): string {
  const margin = computeMarginPercent(costNum, saleNum)
  const markup = computeMarkupPercent(costNum, saleNum)
  if (saleNum <= 0) return 'Sin precio de venta'
  if (costNum <= 0) return 'Sin costo registrado'
  return `${margin}% margen · ${markup}% markup`
}
