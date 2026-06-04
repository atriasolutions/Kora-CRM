import {
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InventoryDetail } from '@/data/inventory-detail.mock'
import type { InventoryStatus } from '@/data/inventory.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import { useWarehouseLocationOptions } from '@/hooks/use-catalog-options'
import {
  INVENTORY_STATUS_OPTIONS,
  type InventoryFormValues,
} from '@/lib/inventory-form'

type InventoryDetailSidebarProps = {
  inventory: InventoryDetail
  isEditing?: boolean
  form?: InventoryFormValues
  onFormChange?: (patch: Partial<InventoryFormValues>) => void
}

/** Formulario de edición (diálogo Editar inventario). */
export function InventoryDetailSidebar({
  inventory: _inventory,
  isEditing = false,
  form,
  onFormChange,
}: InventoryDetailSidebarProps) {
  const locationOptions = useWarehouseLocationOptions()
  const patch = (partial: Partial<InventoryFormValues>) => {
    onFormChange?.(partial)
  }

  if (!isEditing || !form) {
    return null
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-primary/20 shadow-sm ring-1 ring-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Existencias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ContactFormInput
            id="edit-inv-name"
            label="Producto"
            inputVariant="alphanumeric"
            value={form.productName}
            onChange={(productName) => patch({ productName })}
          />
          <ContactFormInput
            id="edit-inv-sku"
            label="SKU"
            inputVariant="alphanumeric"
            value={form.sku}
            onChange={(sku) => patch({ sku })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <ContactFormInput
              id="edit-inv-qty"
              label="Cantidad"
              inputVariant="integer"
              value={form.quantity}
              onChange={(quantity) => patch({ quantity })}
            />
            <ContactFormInput
              id="edit-inv-min"
              label="Stock mínimo"
              inputVariant="integer"
              value={form.minStock}
              onChange={(minStock) => patch({ minStock })}
            />
          </div>
          <ContactFormSelect
            id="edit-inv-location"
            label="Ubicación"
            value={form.location}
            onChange={(location) => patch({ location })}
            options={locationOptions.map((l) => ({ value: l, label: l }))}
          />
          <ContactFormSelect
            id="edit-inv-status"
            label="Estado"
            value={form.status}
            onChange={(status) => patch({ status: status as InventoryStatus })}
            options={INVENTORY_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          />
          <UserLookupField
            label="Responsable"
            value={form.ownerName}
            onChange={(ownerName) => patch({ ownerName })}
          />
        </CardContent>
      </Card>

      <Card className="border-primary/20 shadow-sm ring-1 ring-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Clasificación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ContactFormInput
            id="edit-inv-category"
            label="Categoría"
            inputVariant="alphanumeric"
            value={form.category}
            onChange={(category) => patch({ category })}
          />
          <ContactFormInput
            id="edit-inv-cost"
            label="Costo unitario"
            inputVariant="amount"
            value={form.unitCost}
            onChange={(unitCost) => patch({ unitCost })}
          />
          <ContactFormInput
            id="edit-inv-zone"
            label="Zona bodega"
            inputVariant="alphanumeric"
            value={form.warehouseZone}
            onChange={(warehouseZone) => patch({ warehouseZone })}
          />
          <ContactFormInput
            id="edit-inv-oc"
            label="OC vinculada"
            inputVariant="alphanumeric"
            value={form.linkedPurchaseRef}
            onChange={(linkedPurchaseRef) => patch({ linkedPurchaseRef })}
          />
          <ContactFormField id="edit-inv-desc" label="Descripción">
            <textarea
              id="edit-inv-desc"
              rows={4}
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </ContactFormField>
        </CardContent>
      </Card>
    </div>
  )
}
