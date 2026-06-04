export type InventoryDetailTab =
  | 'detalle'
  | 'bodegas'
  | 'actividad'
  | 'movimientos'
  | 'compras'
  | 'productos'
  | 'notas'
  | 'archivos'

const INVENTORY_DETAIL_TABS: InventoryDetailTab[] = [
  'detalle',
  'bodegas',
  'actividad',
  'movimientos',
  'compras',
  'productos',
  'notas',
  'archivos',
]

export function isInventoryDetailTab(value: string): value is InventoryDetailTab {
  return (INVENTORY_DETAIL_TABS as string[]).includes(value)
}

export function parseInventoryDetailTab(
  search: string | URLSearchParams,
): InventoryDetailTab | null {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search
  const tab = params.get('tab')
  return tab && isInventoryDetailTab(tab) ? tab : null
}

export function getInventoryDetailPath(inventoryId: string): string {
  return `/inventario/${inventoryId}`
}

export function inventoryDetailPathWithTab(
  path: string,
  tab: InventoryDetailTab,
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
