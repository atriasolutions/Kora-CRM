import { useEffect } from 'react'

import {
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { useCatalogSettings } from '@/hooks/use-catalog-settings'
import {
  activeWarehousesOrDefault,
  formatWarehouseDeliveryAddress,
  resolveWarehouseDisplayAddress,
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
  /** Oculta el texto de ayuda bajo la dirección (p. ej. si el padre lo muestra debajo del grid). */
  hideAddressHelper?: boolean
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
  addressHelperText = 'Se carga desde Configuración → Direcciones de despacho al elegir la ubicación.',
  readOnlyDeliveryAddress = false,
  hideAddressHelper = false,
}: WarehouseDestinationFieldsProps) {
  const { catalog } = useCatalogSettings()
  const warehouses = activeWarehousesOrDefault(catalog.warehouses)

  const selectedId = resolveWarehouseIdFromForm(warehouses, warehouseId, warehouseName)
  const selectedWarehouse = warehouses.find((w) => w.id === selectedId)
  const addressFromCatalog = Boolean(
    selectedWarehouse && warehouseHasCompleteLocation(selectedWarehouse),
  )
  const displayDeliveryAddress = resolveWarehouseDisplayAddress(
    warehouses,
    warehouseId,
    warehouseName,
    deliveryAddress,
  )

  const handleWarehouseChange = (id: string) => {
    const warehouse = warehouses.find((w) => w.id === id)
    onChange(warehouseFormPatchFromSelection(warehouse))
  }

  useEffect(() => {
    if (!selectedWarehouse) return
    const fromCatalog = formatWarehouseDeliveryAddress(selectedWarehouse)
    if (!fromCatalog.trim()) return
    if (readOnlyDeliveryAddress) {
      if (deliveryAddress?.trim() === fromCatalog) return
      onChange(warehouseFormPatchFromSelection(selectedWarehouse))
      return
    }
    if (deliveryAddress?.trim()) return
    onChange(warehouseFormPatchFromSelection(selectedWarehouse))
    // onChange estable en la mayoría de formularios; no incluirlo evita bucles si el padre recrea el callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sincroniza dirección al cargar catálogo
  }, [
    readOnlyDeliveryAddress,
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
        className="min-w-0"
        options={warehouses.map((w) => ({
          value: w.id,
          label: w.code?.trim() ? `${w.name} (${w.code})` : w.name,
        }))}
      />
      {readOnlyDeliveryAddress ? (
        <ContactFormField id={addressFieldId} label={addressLabel}>
          <p className="flex h-9 min-w-0 items-center truncate rounded-md border border-border bg-muted/40 px-3 text-sm font-medium text-foreground">
            {displayDeliveryAddress || '—'}
          </p>
          {!hideAddressHelper ? (
            <p className="text-xs text-muted-foreground">{addressHelperText}</p>
          ) : null}
          {selectedId && !addressFromCatalog ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Esta bodega no tiene dirección, región y comuna configuradas. Complétalas en
              Configuración → Direcciones de despacho.
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
              Esta ubicación no tiene dirección completa en Configuración → Direcciones de despacho. Puedes
              completarla aquí.
            </p>
          ) : null}
        </>
      )}
    </>
  )
}
