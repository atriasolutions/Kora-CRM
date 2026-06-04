import { Plus } from 'lucide-react'

import {
  ContactFormDateInput,
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { PurchaseLineItemFields } from '@/components/purchases/PurchaseLineItemFields'
import { PurchaseSupplierFields } from '@/components/purchases/PurchaseSupplierFields'
import { Button } from '@/components/ui/button'
import type { PurchaseLineItem } from '@/data/purchase-detail.mock'
import type { PurchaseStatus } from '@/data/purchases.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import { formatMoneyCLP } from '@/lib/purchase-fulfillment'
import { defaultManualPurchaseLineItem, defaultPurchaseLineItem, recalcPurchaseLine } from '@/lib/purchase-line-item'
import {
  PURCHASE_PAYMENT_TERMS_OPTIONS,
  normalizePurchasePaymentTerms,
} from '@/lib/purchase-payment-terms'
import { WarehouseDestinationFields } from '@/components/shared/WarehouseDestinationFields'
import {
  PURCHASE_STATUS_OPTIONS,
  type PurchaseFormValues,
} from '@/lib/purchase-form'

type PurchaseOrderFormFieldsProps = {
  form: PurchaseFormValues
  onChange: (patch: Partial<PurchaseFormValues>) => void
  idPrefix?: string
}

export function PurchaseOrderFormFields({
  form,
  onChange,
  idPrefix = 'pur-form',
}: PurchaseOrderFormFieldsProps) {
  const patch = (partial: Partial<PurchaseFormValues>) => onChange(partial)

  const patchLine = (id: string, partial: Partial<PurchaseLineItem>) => {
    onChange({
      lineItems: form.lineItems.map((li) =>
        li.id === id ? recalcPurchaseLine({ ...li, ...partial }) : li,
      ),
    })
  }

  const addProductLine = () => {
    onChange({
      lineItems: [...form.lineItems, defaultPurchaseLineItem()],
    })
  }

  const addManualLine = () => {
    onChange({
      lineItems: [...form.lineItems, defaultManualPurchaseLineItem()],
    })
  }

  const removeLine = (id: string) => {
    onChange({ lineItems: form.lineItems.filter((li) => li.id !== id) })
  }

  const linesTotal = form.lineItems.reduce(
    (s, li) => s + (Number.parseInt(li.total.replace(/[^\d]/g, ''), 10) || 0),
    0,
  )

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground">Datos de la orden</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormDateInput
            id={`${idPrefix}-date`}
            label="Fecha de orden"
            value={form.orderDate}
            onChange={(orderDate) => patch({ orderDate })}
          />
          <ContactFormSelect
            id={`${idPrefix}-status`}
            label="Estado"
            value={form.status}
            onChange={(status) => patch({ status: status as PurchaseStatus })}
            options={PURCHASE_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          />
          <UserLookupField
            label="Responsable interno"
            value={form.ownerName}
            onChange={(ownerName) => patch({ ownerName })}
          />
        </div>
        <ContactFormInput
          id={`${idPrefix}-summary`}
          label="Resumen de productos"
          inputVariant="alphanumeric"
          value={form.productSummary}
          placeholder="Ej. Licencias SaaS · Hardware"
          onChange={(productSummary) => patch({ productSummary })}
        />
        <p className="text-xs text-muted-foreground">
          Monto calculado desde líneas:{' '}
          <span className="font-medium text-foreground">{formatMoneyCLP(linesTotal)}</span>
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground">Proveedor</h3>
        <PurchaseSupplierFields
          values={{
            supplierId: form.supplierId,
            supplier: form.supplier,
            supplierContactId: form.supplierContactId,
            supplierContact: form.supplierContact,
            supplierEmail: form.supplierEmail,
            supplierPhone: form.supplierPhone,
          }}
          onChange={(p) => patch(p)}
        />
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Líneas de la orden</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-border"
              onClick={addProductLine}
            >
              <Plus aria-hidden className="size-4" />
              Producto
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-border"
              onClick={addManualLine}
            >
              <Plus aria-hidden className="size-4" />
              Servicio / otro
            </Button>
          </div>
        </div>
        {form.lineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Agrega productos del catálogo o ítems manuales (flete, instalación, etc.).
          </p>
        ) : (
          <div className="space-y-3">
            {form.lineItems.map((li, index) => (
              <PurchaseLineItemFields
                key={li.id}
                line={li}
                index={index}
                idPrefix={idPrefix}
                canRemove={form.lineItems.length > 1}
                onPatch={(partial) => patchLine(li.id, partial)}
                onRemove={() => removeLine(li.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground">Logística y entrega</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactFormDateInput
            id={`${idPrefix}-delivery`}
            label="Entrega estimada"
            value={form.expectedDelivery}
            onChange={(expectedDelivery) => patch({ expectedDelivery })}
          />
          <ContactFormSelect
            id={`${idPrefix}-terms`}
            label="Condiciones de pago"
            value={normalizePurchasePaymentTerms(form.paymentTerms)}
            onChange={(paymentTerms) => patch({ paymentTerms })}
            options={PURCHASE_PAYMENT_TERMS_OPTIONS.map((opt) => ({
              value: opt,
              label: opt,
            }))}
          />
          <WarehouseDestinationFields
            warehouseFieldId={`${idPrefix}-warehouse`}
            addressFieldId={`${idPrefix}-address`}
            warehouseId={form.warehouseId}
            warehouseName={form.warehouse}
            deliveryAddress={form.deliveryAddress}
            readOnlyDeliveryAddress
            onChange={(whPatch) => patch(whPatch)}
          />
        </div>
        <ContactFormField id={`${idPrefix}-desc`} label="Observaciones / descripción">
          <textarea
            id={`${idPrefix}-desc`}
            rows={4}
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Notas para el proveedor o equipo interno…"
          />
        </ContactFormField>
      </section>
    </div>
  )
}
