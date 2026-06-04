/** Evento global cuando el servidor indica que hay que recargar actividades (WS). */
export const ACTIVITIES_UPDATED_EVENT = 'kora:activities-updated'

/** Evento global cuando el inventario cambió en el servidor (WS). */
export const INVENTORY_UPDATED_EVENT = 'kora:inventory-updated'

export function dispatchActivitiesUpdated(): void {
  window.dispatchEvent(new CustomEvent(ACTIVITIES_UPDATED_EVENT))
}

export function dispatchInventoryUpdated(): void {
  window.dispatchEvent(new CustomEvent(INVENTORY_UPDATED_EVENT))
}
