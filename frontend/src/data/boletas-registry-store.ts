import type { BoletaListItem } from '@/data/boletas.mock'

let registrySnapshot: BoletaListItem[] = []

export function syncRegistryBoletas(items: BoletaListItem[]) {
  registrySnapshot = items
}

export function getRegistryBoletaById(id: string): BoletaListItem | undefined {
  return registrySnapshot.find((bol) => bol.id === id)
}

export function getAllKnownBoletas(): BoletaListItem[] {
  return registrySnapshot
}
