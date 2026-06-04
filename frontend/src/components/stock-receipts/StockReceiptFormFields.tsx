import { Building2, FileText } from 'lucide-react'

import {
  ContactFormInput,
  ContactFormSelect,
  ContactFormTextarea,
} from '@/components/contacts/ContactFormField'
import { PurchaseLookupField } from '@/components/shared/PurchaseLookupField'
import { StockReceiptLineItemsEditor } from '@/components/stock-receipts/StockReceiptLineItemsEditor'
import { loadPurchaseDetail } from '@/lib/entity-detail-loaders'
import { useCatalogSettings } from '@/hooks/use-catalog-settings'
import {
  activeWarehousesOrDefault,
  resolveWarehouseFromStoredLabel,
  resolveWarehouseIdFromForm,
  warehouseFormPatchFromSelection,
} from '@/lib/warehouse-lookup'
import { UserLookupField } from '@/components/shared/UserLookupField'
import { pendingQtyBySkuForPurchase } from '@/lib/purchase-inbound-stock'
import { stockReceiptLinesFromPurchase } from '@/lib/stock-receipt-line-item'
import { normalizeSku } from '@/lib/stock-sku'
import type {
  StockReceiptFormValues,
  StockReceiptSourceMode,
} from '@/lib/stock-receipt-form'
import { cn } from '@/lib/utils'

type StockReceiptFormFieldsProps = {
  form: StockReceiptFormValues
  onChange: (patch: Partial<StockReceiptFormValues>) => void
  idPrefix?: string
  lockPurchase?: boolean
  /** Mostrar número (solo tras crear el registro o en modo local). */
  showReceiptNumber?: boolean
  /** Número secuencial asignado por el sistema (no editable). */
  numberReadOnly?: boolean
  /** Al editar un borrador vinculado a OC. */
  excludeReceiptId?: string
}

const sourceOptions: {
  id: StockReceiptSourceMode
  label: string
  hint: string
  Icon: typeof FileText
}[] = [
  {
    id: 'purchase',
    label: 'Desde orden de compra',
    hint: 'Vincula una OC recibida',
    Icon: Building2,
  },
  {
    id: 'standalone',
    label: 'Sin orden de compra',
    hint: 'Referencia externa libre',
    Icon: FileText,
  },
]

export function StockReceiptFormFields({
  form,
  onChange,
  idPrefix = 'sr-form',
  lockPurchase = false,
  showReceiptNumber = true,
  numberReadOnly = false,
  excludeReceiptId,
}: StockReceiptFormFieldsProps) {
  const { catalog } = useCatalogSettings()
  const warehouses = activeWarehousesOrDefault(catalog.warehouses)
  const warehouseSelectId = resolveWarehouseIdFromForm(
    warehouses,
    form.warehouseId,
    form.warehouse,
  )

  const setSourceMode = (sourceMode: StockReceiptSourceMode) => {
    if (sourceMode === form.sourceMode) return
    onChange({
      sourceMode,
      purchaseId: '',
      purchaseReference: '',
      supplier: '',
      externalReference: sourceMode === 'standalone' ? form.externalReference : '',
    })
  }

  const handlePurchaseChange = (purchaseId: string) => {
    if (!purchaseId.trim()) {
      onChange({
        purchaseId: '',
        purchaseReference: '',
        supplier: '',
      })
      return
    }
    void loadPurchaseDetail(purchaseId).then((detail) => {
      const lines = stockReceiptLinesFromPurchase(purchaseId, detail.lineItems)
      const catalogWh =
        (detail.warehouseId
          ? catalog.warehouses.find((w) => w.id === detail.warehouseId)
          : undefined) ??
        resolveWarehouseFromStoredLabel(catalog.warehouses, detail.warehouse)
      const whPatch = warehouseFormPatchFromSelection(catalogWh)

      onChange({
        purchaseId,
        purchaseReference: detail.reference,
        supplier: detail.supplier,
        warehouseId: detail.warehouseId ?? whPatch.warehouseId,
        warehouse: whPatch.warehouse || detail.warehouse,
        externalReference: detail.reference,
        purchaseLineItems: detail.lineItems,
        lineItems: lines.length > 0 ? lines : form.lineItems,
      })
    })
  }

  const pendingBySku =
    form.sourceMode === 'purchase' &&
    form.purchaseId.trim() &&
    form.purchaseLineItems &&
    form.purchaseLineItems.length > 0
      ? pendingQtyBySkuForPurchase(form.purchaseId, form.purchaseLineItems, {
          excludeReceiptId,
        })
      : undefined

  const pendingMaxForLine = (sku: string) => {
    if (!pendingBySku || !sku.trim()) return undefined
    return pendingBySku.get(normalizeSku(sku))
  }

  return (
    <div className="space-y-4">
      {!lockPurchase ? (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Origen del ingreso</p>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
            {sourceOptions.map(({ id, label, hint, Icon }) => {
              const active = form.sourceMode === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSourceMode(id)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/40',
                  )}
                >
                  <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    <span className="block text-sm font-medium text-foreground">{label}</span>
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {showReceiptNumber ? (
        numberReadOnly ? (
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Número de ingreso</p>
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
              {form.number || '—'}
            </p>
          </div>
        ) : (
          <ContactFormInput
            id={`${idPrefix}-number`}
            label="Número de ingreso"
            inputVariant="alphanumeric"
            value={form.number}
            onChange={(number) => onChange({ number })}
          />
        )
      ) : null}

      {form.sourceMode === 'purchase' || lockPurchase ? (
        <PurchaseLookupField
          value={form.purchaseId}
          purchaseReference={form.purchaseReference}
          onChange={(id) => handlePurchaseChange(id)}
          disabled={lockPurchase}
        />
      ) : (
        <ContactFormInput
          id={`${idPrefix}-ext-ref`}
          label="Referencia externa"
          inputVariant="alphanumeric"
          value={form.externalReference}
          onChange={(externalReference) => onChange({ externalReference })}
          placeholder="Factura proveedor, guía de despacho…"
        />
      )}

      <ContactFormSelect
        id={`${idPrefix}-warehouse`}
        label="Bodega"
        value={warehouseSelectId}
        onChange={(id) => {
          const wh = warehouses.find((w) => w.id === id)
          onChange(warehouseFormPatchFromSelection(wh))
        }}
        options={warehouses.map((w) => ({
          value: w.id,
          label: w.code?.trim() ? `${w.name} (${w.code})` : w.name,
        }))}
      />

      <UserLookupField
        label="Responsable"
        value={form.ownerName}
        onChange={(ownerName) => onChange({ ownerName })}
      />

      <StockReceiptLineItemsEditor
        lineItems={form.lineItems}
        onChange={(lineItems) => onChange({ lineItems })}
        idPrefix={`${idPrefix}-lines`}
        pendingMaxForSku={pendingMaxForLine}
      />

      <ContactFormTextarea
        id={`${idPrefix}-memo`}
        label="Observaciones del ingreso"
        value={form.memo}
        onChange={(memo) => onChange({ memo })}
        rows={2}
        placeholder="Comentario interno al crear o editar el borrador…"
      />
    </div>
  )
}
