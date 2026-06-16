import {
  Boxes,
  MapPin,
  Package,
  Pencil,
  Warehouse,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { RegisterActivityHeaderButton } from '@/components/shared/RegisterActivityHeaderButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { InventoryDetail } from '@/data/inventory-detail.mock'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import type { InventoryStatus } from '@/data/inventory.mock'
import { inventoryStatusVariant } from '@/lib/inventory-display'
import { useWarehouseLocationOptions } from '@/hooks/use-catalog-options'
import {
  INVENTORY_STATUS_OPTIONS,
  type InventoryFormValues,
} from '@/lib/inventory-form'
import { useDetailHeaderPermissions } from '@/hooks/use-detail-header-permissions'
import { cn } from '@/lib/utils'

type InventoryDetailHeaderProps = {
  inventory: InventoryDetail
  isEditing?: boolean
  form?: InventoryFormValues
  onFormChange?: (patch: Partial<InventoryFormValues>) => void
  onStartEdit?: () => void
  onRegisterActivity?: (presetType?: ContactActivityType) => void
}

export function InventoryDetailHeader({
  inventory,
  isEditing = false,
  form,
  onFormChange,
  onStartEdit,
  onRegisterActivity,
}: InventoryDetailHeaderProps) {
  const { showEdit } = useDetailHeaderPermissions('inventario', { onStartEdit })

  const locationOptions = useWarehouseLocationOptions()

  const displayName = isEditing && form ? form.productName : inventory.productName
  const displaySku = isEditing && form ? form.sku : inventory.sku
  const displayStatus = isEditing && form ? form.status : inventory.status
  const displayLocation = isEditing && form ? form.location : inventory.location

  const patch = (partial: Partial<InventoryFormValues>) => {
    onFormChange?.(partial)
  }

  const statusVariant = inventoryStatusVariant(displayStatus)

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm',
        isEditing ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border',
      )}
    >
      <div
        className={cn(
          'p-5 sm:p-6',
          isEditing ? 'bg-primary/5' : 'bg-gradient-to-br from-muted/40 via-card to-card',
        )}
      >
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-gradient-to-br from-primary/10 to-chart-5/10 sm:size-16">
              <Boxes aria-hidden className="size-7 text-primary sm:size-8" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {isEditing && form ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <ContactFormInput
                    id="inv-header-name"
                    label="Producto"
                    value={form.productName}
                    className="sm:col-span-2"
                    onChange={(productName) => patch({ productName })}
                  />
                  <ContactFormInput
                    id="inv-header-sku"
                    label="SKU"
                    value={form.sku}
                    onChange={(sku) => patch({ sku })}
                  />
                  <ContactFormSelect
                    id="inv-header-status"
                    label="Estado"
                    value={form.status}
                    onChange={(status) => patch({ status: status as InventoryStatus })}
                    options={INVENTORY_STATUS_OPTIONS.map((s) => ({
                      value: s,
                      label: s,
                    }))}
                  />
                  <ContactFormSelect
                    id="inv-header-location"
                    label="Ubicación"
                    value={form.location}
                    onChange={(location) => patch({ location })}
                    options={locationOptions.map((l) => ({
                      value: l,
                      label: l,
                    }))}
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">
                      {displayName}
                    </h1>
                    <Badge variant={statusVariant}>{displayStatus}</Badge>
                    {inventory.isProductView ? (
                      <Badge variant="outline">Vista por producto</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-mono text-foreground/90">{displaySku}</span>
                    {' · '}
                    <span className="inline-flex items-center gap-1">
                      <MapPin aria-hidden className="size-3.5" />
                      {displayLocation}
                    </span>
                    {' · '}
                    {inventory.owner}
                  </p>
                  {inventory.linkedPurchaseRef ? (
                    <Link
                      to="/compras"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Warehouse aria-hidden className="size-4" />
                      OC vinculada: {inventory.linkedPurchaseRef}
                    </Link>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {!isEditing ? (
            <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/60 pt-4 2xl:w-auto 2xl:shrink-0 2xl:border-t-0 2xl:pt-0">
              <RegisterActivityHeaderButton onRegister={onRegisterActivity} />
              {showEdit ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border shadow-sm"
                  onClick={onStartEdit}
                >
                  <Pencil aria-hidden className="size-4" />
                  Ajustar stock
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {!isEditing ? (
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Package aria-hidden className="size-3.5" />
              {inventory.category}
            </span>
            <span>{inventory.warehouseZone}</span>
            <span>{inventory.lastMovement}</span>
          </p>
        ) : null}
      </div>
    </section>
  )
}
