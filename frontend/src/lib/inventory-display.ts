import type { InventoryStatus } from '@/data/inventory.mock'

export function inventoryStatusVariant(
  status: InventoryStatus,
): 'customer' | 'negotiation' | 'destructive' | 'secondary' | 'muted' {
  switch (status) {
    case 'En tránsito':
      return 'muted'
    case 'En stock':
      return 'customer'
    case 'Stock bajo':
      return 'negotiation'
    case 'Quiebre de stock':
    case 'Sin stock':
      return 'destructive'
    case 'Reservado':
    default:
      return 'secondary'
  }
}
