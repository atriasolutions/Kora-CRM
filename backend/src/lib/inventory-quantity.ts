/** Disponible = unidades físicas en bodega; las reservas se liberan al emitir la factura. */
export function computeAvailableQuantity(onHand: number): number {
  return Math.max(0, onHand)
}
