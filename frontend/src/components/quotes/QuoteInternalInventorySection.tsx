import { Warehouse } from 'lucide-react'

import { WarehouseDestinationFields } from '@/components/shared/WarehouseDestinationFields'
import { useCatalogSettings } from '@/hooks/use-catalog-settings'
import {
  activeWarehousesOrDefault,
  resolveWarehouseDisplayAddress,
} from '@/lib/warehouse-lookup'

type QuoteInternalInventorySectionProps = {
  warehouseFieldId: string
  addressFieldId: string
  warehouseId?: string
  warehouseName: string
  deliveryAddress: string
  onChange?: (patch: {
    warehouseId?: string
    warehouse?: string
    deliveryAddress?: string
  }) => void
  /** Solo lectura (detalle de cotización). */
  readOnly?: boolean
}

export function QuoteInternalInventorySectionDescription() {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      Indica desde qué bodega se reserva y descuenta el stock al confirmar la venta.{' '}
      <span className="font-medium text-foreground">
        No se incluye en la cotización ni en el PDF enviado al cliente.
      </span>
    </p>
  )
}

export function QuoteInternalInventorySection({
  warehouseFieldId,
  addressFieldId,
  warehouseId,
  warehouseName,
  deliveryAddress,
  onChange,
  readOnly = false,
}: QuoteInternalInventorySectionProps) {
  const { catalog } = useCatalogSettings()
  const warehouses = activeWarehousesOrDefault(catalog.warehouses)
  const displayAddress = resolveWarehouseDisplayAddress(
    warehouses,
    warehouseId,
    warehouseName,
    deliveryAddress,
  )

  if (readOnly) {
    return (
      <section className="space-y-3 rounded-lg border border-dashed border-border bg-muted/20 p-4">
        <div className="flex items-start gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Warehouse aria-hidden className="size-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Inventario interno</h3>
            <QuoteInternalInventorySectionDescription />
          </div>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Dirección de origen</dt>
            <dd className="font-medium text-foreground">{warehouseName?.trim() || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Dirección</dt>
            <dd className="font-medium text-foreground">{displayAddress || '—'}</dd>
          </div>
        </dl>
      </section>
    )
  }

  return (
    <section className="space-y-3 rounded-lg border border-dashed border-border bg-muted/20 p-4">
      <div className="flex items-start gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Warehouse aria-hidden className="size-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Inventario interno</h3>
          <QuoteInternalInventorySectionDescription />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <WarehouseDestinationFields
          warehouseFieldId={warehouseFieldId}
          addressFieldId={addressFieldId}
          warehouseId={warehouseId}
          warehouseName={warehouseName}
          deliveryAddress={deliveryAddress}
          readOnlyDeliveryAddress
          warehouseLabel="Dirección de origen"
          addressLabel="Dirección"
          addressHelperText="Se carga desde Configuración → Direcciones de despacho al elegir la ubicación. Solo para reservas y movimientos de stock."
          onChange={onChange ?? (() => {})}
        />
      </div>
    </section>
  )
}
