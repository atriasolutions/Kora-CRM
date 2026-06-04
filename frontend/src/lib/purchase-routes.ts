export type PurchaseDetailTab =
  | 'detalle'
  | 'actividad'
  | 'lineas'
  | 'ingresos'
  | 'inventario'
  | 'notas'
  | 'archivos'

const PURCHASE_DETAIL_TABS: PurchaseDetailTab[] = [
  'detalle',
  'actividad',
  'lineas',
  'ingresos',
  'inventario',
  'notas',
  'archivos',
]

export function isPurchaseDetailTab(value: string): value is PurchaseDetailTab {
  return (PURCHASE_DETAIL_TABS as string[]).includes(value)
}

export function parsePurchaseDetailTab(
  search: string | URLSearchParams,
): PurchaseDetailTab | null {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search
  const tab = params.get('tab')
  return tab && isPurchaseDetailTab(tab) ? tab : null
}

export function getPurchaseDetailPath(purchaseId: string): string {
  return `/compras/${purchaseId}`
}

export function purchaseDetailPathWithTab(
  path: string,
  tab: PurchaseDetailTab,
): string {
  const [pathname, search = ''] = path.split('?')
  const params = new URLSearchParams(search)
  if (tab === 'detalle') {
    params.delete('tab')
  } else {
    params.set('tab', tab)
  }
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}
