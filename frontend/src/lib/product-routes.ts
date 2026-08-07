export type ProductDetailTab =
  | 'detalle'
  | 'variedades'
  | 'actividad'
  | 'inventario'
  | 'ingresos'
  | 'compras'
  | 'facturas'
  | 'notas'

const PRODUCT_DETAIL_TABS: ProductDetailTab[] = [
  'detalle',
  'variedades',
  'actividad',
  'inventario',
  'ingresos',
  'compras',
  'facturas',
  'notas',
]

export function isProductDetailTab(value: string): value is ProductDetailTab {
  return (PRODUCT_DETAIL_TABS as string[]).includes(value)
}

export function parseProductDetailTab(
  search: string | URLSearchParams,
): ProductDetailTab | null {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search
  const tab = params.get('tab')
  return tab && isProductDetailTab(tab) ? tab : null
}
