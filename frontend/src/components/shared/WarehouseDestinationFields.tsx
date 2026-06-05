import { useEffect } from 'react'

import {
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { useCatalogSettings } from '@/hooks/use-catalog-settings'
import {
  activeWarehousesOrDefault,
  resolveWarehouseIdFromForm,
  warehouseFormPatchFromSelection,
  warehouseHasCompleteLocation,
} from '@/lib/warehouse-lookup'

type WarehouseDestinationFieldsProps = {
  warehouseId?: string
  warehouseName: string
  deliveryAddress: string
  onChange: (patch: {
    warehouseId?: string
    warehouse?: string
    deliveryAddress?: string
  }) => void
  warehouseFieldId: string
  addressFieldId: string
  warehouseLabel?: string
  addressLabel?: string
  /** Texto bajo la dirección en modo solo lectura. */
  addressHelperText?: string
  /** La dirección solo se muestra; se obtiene de la bodega en Configuración. */
  readOnlyDeliveryAddress?: boolean
}

export function WarehouseDestinationFields({
  warehouseId,
  warehouseName,
  deliveryAddress,
  onChange,
  warehouseFieldId,
  addressFieldId,
  warehouseLabel = 'Bodega destino',
  addressLabel = 'Dirección de entrega',
  addressHelperText = 'Se carga desde Configuración → Bodegas al elegir la bodega destino.',
  readOnlyDeliveryAddress = false,
}: WarehouseDestinationFieldsProps) {
  const { catalog } = useCatalogSettings()
  const warehouses = activeWarehousesOrDefault(catalog.warehouses)

  const selectedId = resolveWarehouseIdFromForm(warehouses, warehouseId, warehouseName)
  const selectedWarehouse = warehouses.find((w) => w.id === selectedId)
  const addressFromCatalog = Boolean(
    selectedWarehouse && warehouseHasCompleteLocation(selectedWarehouse),
  )

  const handleWarehouseChange = (id: string) => {
    const warehouse = warehouses.find((w) => w.id === id)
    onChange(warehouseFormPatchFromSelection(warehouse))
  }

  useEffect(() => {
    if (!selectedWarehouse || !warehouseHasCompleteLocation(selectedWarehouse)) return
    if (deliveryAddress?.trim()) return
    onChange(warehouseFormPatchFromSelection(selectedWarehouse))
    // onChange estable en la mayoría de formularios; no incluirlo evita bucles si el padre recrea el callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sincroniza dirección al cargar catálogo
  }, [
    selectedId,
    selectedWarehouse?.address,
    selectedWarehouse?.region,
    selectedWarehouse?.commune,
    deliveryAddress,
  ])

  return (
    <>
      <ContactFormSelect
        id={warehouseFieldId}
        label={warehouseLabel}
        value={selectedId}
        onChange={handleWarehouseChange}
        options={warehouses.map((w) => ({
          value: w.id,
          label: w.code?.trim() ? `${w.name} (${w.code})` : w.name,
        }))}
      />
      {readOnlyDeliveryAddress ? (
        <ContactFormField id={addressFieldId} label={addressLabel}>
          <p className="truncate rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
            {deliveryAddress?.trim() || '—'}
          </p>
          <p className="text-xs text-muted-foreground">{addressHelperText}</p>
          {selectedId && !addressFromCatalog ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Esta bodega no tiene dirección, región y comuna configuradas. Complétalas en
              Configuración → Bodegas.
            </p>
          ) : null}
        </ContactFormField>
      ) : (
        <>
          <ContactFormInput
            id={addressFieldId}
            label={addressLabel}
            value={deliveryAddress}
            onChange={(addr) => onChange({ deliveryAddress: addr })}
            disabled={addressFromCatalog}
            placeholder={
              addressFromCatalog
                ? 'Definida en configuración de bodegas'
                : 'Ingresa la dirección de entrega'
            }
          />
          {!addressFromCatalog && selectedId ? (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Esta bodega no tiene ubicación completa en Configuración → Bodegas. Puedes
              completarla aquí.
            </p>
          ) : null}
        </>
      )}
    </>
  )
}
