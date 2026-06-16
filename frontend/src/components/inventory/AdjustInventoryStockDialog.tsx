import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'

import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isApiEnabled } from '@/api/config'
import { adjustInventoryApi, findInventoryPositionIdApi } from '@/api/inventory'
import type { InventoryDetail } from '@/data/inventory-detail.mock'
import { useWarehouseLocationOptions } from '@/hooks/use-catalog-options'
import { getInventoryProductSummaryBySku } from '@/lib/inventory-aggregate'
import { productForInventorySku } from '@/lib/inventory-relations'
import { parseSignedInteger } from '@/lib/form-input-format'
import { getRegistryProducts } from '@/data/products-registry-store'
import { INVENTORY_REGISTRY_SYNC_EVENT } from '@/lib/product-inventory-sync'
import {
  applyInventoryAdjustment,
  applyInventoryTransfer,
  inventoryStockAtLocation,
} from '@/lib/stock-service'
import { cn } from '@/lib/utils'

type AdjustMode = 'ajuste' | 'traslado'

type AdjustInventoryStockDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventory: InventoryDetail
  onApplied: () => void
  defaultFromLocation?: string
}

const useApi = isApiEnabled()

function refreshInventoryRegistry() {
  window.dispatchEvent(new Event(INVENTORY_REGISTRY_SYNC_EVENT))
}

async function resolveInventoryPositionId(
  inventory: InventoryDetail,
  warehouse: string,
): Promise<string | null> {
  const warehouseNorm = warehouse.trim().toLowerCase()
  if (
    !inventory.isProductView &&
    inventory.location.trim().toLowerCase() === warehouseNorm
  ) {
    return inventory.id
  }
  if (!useApi) {
    const { row } = inventoryStockAtLocation(inventory.sku, warehouse)
    return row?.id ?? null
  }
  const id = await findInventoryPositionIdApi(inventory.sku, warehouse)
  return id ?? null
}

export function AdjustInventoryStockDialog({
  open,
  onOpenChange,
  inventory,
  onApplied,
  defaultFromLocation,
}: AdjustInventoryStockDialogProps) {
  const warehouseOptions = useWarehouseLocationOptions()
  const [mode, setMode] = useState<AdjustMode>('ajuste')
  const [warehouse, setWarehouse] = useState('')
  const [fromLocation, setFromLocation] = useState('')
  const [toLocation, setToLocation] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const product = useMemo(
    () => productForInventorySku(getRegistryProducts(), inventory.sku),
    [inventory.sku],
  )

  const unitLabel = product?.unitOfMeasure?.trim() || product?.customUnit?.trim() || 'u.'

  const initialWarehouse = useMemo(() => {
    if (defaultFromLocation?.trim()) return defaultFromLocation.trim()
    if (!inventory.isProductView && inventory.location.trim()) {
      return inventory.location.trim()
    }
    for (const loc of warehouseOptions) {
      const { onHand } = inventoryStockAtLocation(inventory.sku, loc)
      if (onHand > 0) return loc
    }
    return warehouseOptions[0] ?? ''
  }, [
    defaultFromLocation,
    inventory.isProductView,
    inventory.location,
    inventory.sku,
    warehouseOptions,
  ])

  const stockAtWarehouse = useMemo(() => {
    if (useApi && inventory.isProductView) {
      const summary = getInventoryProductSummaryBySku(inventory.sku)
      const locNorm = warehouse.trim().toLowerCase()
      const row = summary?.locationRows.find(
        (r) => r.location.trim().toLowerCase() === locNorm,
      )
      if (row) {
        const onHand = row.onHandQtyNum ?? row.quantityNum ?? 0
        const available = row.availableQtyNum ?? onHand
        return { onHand, available, row }
      }
    }
    return inventoryStockAtLocation(inventory.sku, warehouse)
  }, [inventory.isProductView, inventory.sku, warehouse])

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setMode('ajuste')
      setWarehouse(initialWarehouse)
      setFromLocation(initialWarehouse)
      setToLocation('')
      setQuantity('')
      setNote('')
      setSaving(false)
    })
  }, [open, initialWarehouse])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (mode === 'ajuste') {
        const signed = parseSignedInteger(quantity)
        if (!Number.isFinite(signed) || signed === 0) {
          toast.warning('Indica una cantidad distinta de cero (positiva o negativa).')
          return
        }
        if (!warehouse.trim()) {
          toast.warning('Selecciona una bodega.')
          return
        }
        if (signed < 0 && stockAtWarehouse.available + signed < 0) {
          toast.warning(
            `No hay stock suficiente en ${warehouse} (disponible: ${stockAtWarehouse.available}).`,
          )
          return
        }

        if (useApi) {
          const positionId = await resolveInventoryPositionId(inventory, warehouse)
          if (!positionId) {
            toast.error(
              `No hay registro de inventario en «${warehouse}» para este SKU. Crea la posición o elige otra bodega.`,
            )
            return
          }
          await adjustInventoryApi(positionId, {
            quantityDelta: signed,
            note: note.trim() || `Ajuste manual · ${warehouse}`,
          })
          refreshInventoryRegistry()
          onApplied()
          onOpenChange(false)
          return
        }

        const result = applyInventoryAdjustment({
          sku: inventory.sku,
          location: warehouse,
          quantityDelta: signed,
          reference: note.trim() || `Ajuste manual · ${warehouse}`,
        })
        if (!result.ok) {
          toast.error(result.message ?? 'No se pudo aplicar el ajuste.')
          return
        }
        onApplied()
        onOpenChange(false)
        return
      }

      if (useApi) {
        toast.warning(
          'El traslado entre bodegas aún no está disponible con el servidor. Usa un ajuste negativo en origen y positivo en destino.',
        )
        return
      }

      const transferQty = Number.parseInt(quantity.replace(/[^\d]/g, ''), 10)
      if (!Number.isFinite(transferQty) || transferQty <= 0) {
        toast.warning('La cantidad debe ser un entero mayor que cero.')
        return
      }
      const result = applyInventoryTransfer({
        sku: inventory.sku,
        fromLocation,
        toLocation,
        quantity: transferQty,
      })
      if (!result.ok) {
        toast.error(result.message ?? 'No se pudo aplicar el traslado.')
        return
      }
      onApplied()
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo aplicar la operación.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajuste o traslado de stock</DialogTitle>
          <DialogDescription>
            Corrige existencias o mueve unidades entre bodegas. El catálogo del producto no se
            modifica aquí.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Producto: </span>
              <span className="font-medium">{inventory.productName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">SKU: </span>
              <span className="font-mono">{inventory.sku}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Categoría: </span>
              {inventory.category || product?.category || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Unidad: </span>
              {unitLabel}
            </p>
            {mode === 'ajuste' && warehouse ? (
              <p>
                <span className="text-muted-foreground">Disponible ({warehouse}): </span>
                <span className="font-medium tabular-nums">{stockAtWarehouse.available}</span>
                <span className="text-muted-foreground">
                  {' '}
                  · En mano: {stockAtWarehouse.onHand}
                </span>
              </p>
            ) : null}
          </div>

          <div className="flex gap-2">
            {(['ajuste', 'traslado'] as const).map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={mode === m ? 'default' : 'outline'}
                onClick={() => setMode(m)}
              >
                {m === 'ajuste' ? 'Ajuste' : 'Traslado'}
              </Button>
            ))}
          </div>

          {mode === 'ajuste' ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Bodega</p>
                <select
                  className={cn(
                    'flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm shadow-sm',
                  )}
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                >
                  {warehouseOptions.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
              <ContactFormInput
                id="adj-qty"
                label={`Cantidad (+ ingresa / − salida, ${unitLabel})`}
                inputVariant="signedInteger"
                value={quantity}
                onChange={setQuantity}
              />
              <ContactFormInput
                id="adj-note"
                label="Motivo / referencia"
                inputVariant="alphanumeric"
                value={note}
                onChange={setNote}
              />
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Bodega origen</p>
                  <select
                    className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                  >
                    {warehouseOptions.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Bodega destino</p>
                  <select
                    className="flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value)}
                  >
                    <option value="">Seleccionar…</option>
                    {warehouseOptions.filter((l) => l !== fromLocation).map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <ContactFormInput
                id="transfer-qty"
                label={`Cantidad a trasladar (${unitLabel})`}
                inputVariant="integer"
                value={quantity}
                onChange={setQuantity}
              />
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Aplicando…' : 'Aplicar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
