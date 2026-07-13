import { useState } from 'react'

import {
  ContactFormCheckbox,
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { AvatarImageUpload } from '@/components/shared/AvatarImageUpload'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import type { ProductStatus } from '@/data/products.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import {
  BILLING_PERIOD_OPTIONS,
  DIMENSION_UNIT_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  UNIT_OF_MEASURE_OPTIONS,
  WEIGHT_UNIT_OPTIONS,
  type ProductFormValues,
  PRODUCT_CURRENCIES,
  PRODUCT_CURRENCY_LABELS,
} from '@/lib/product-form'
import { ProductPriceInput } from '@/components/products/ProductPriceInput'
import { useProductCategoryOptions, useProductSubcategoryOptions } from '@/hooks/use-catalog-options'
import { inventoryQuantityInputValue, parseStockNum } from '@/lib/product-display'
import {
  formatProductInventoryStockSummary,
  hasInventoryPositions,
  hasSignificantInventoryStock,
  resolveProductInventoryStockSummary,
  type ProductInventoryStockSummary,
} from '@/lib/product-track-inventory-toggle'
import {
  formatProductPriceAmount,
  parseProductPrice,
} from '@/lib/product-currency-input'

type ProductFormFieldsProps = {
  form: ProductFormValues
  onChange: (patch: Partial<ProductFormValues>) => void
  showImage?: boolean
  compact?: boolean
  /** SKU del producto en edición (para evaluar inventario al desactivar control de stock). */
  inventoryContextSku?: string
}

export function ProductFormFields({
  form,
  onChange,
  showImage = true,
  compact = false,
  inventoryContextSku,
}: ProductFormFieldsProps) {
  const categoryOptions = useProductCategoryOptions()
  const subcategoryOptions = useProductSubcategoryOptions(form.category)
  const patch = (partial: Partial<ProductFormValues>) => onChange(partial)
  const [disableTrackDialogOpen, setDisableTrackDialogOpen] = useState(false)
  const [disableTrackLoading, setDisableTrackLoading] = useState(false)
  const [disableTrackSummary, setDisableTrackSummary] =
    useState<ProductInventoryStockSummary | null>(null)

  const applyDisableTrackInventory = () => {
    patch({ trackInventory: false, stock: '—', minStock: '', maxStock: '' })
    setDisableTrackDialogOpen(false)
    setDisableTrackSummary(null)
  }

  const handleTrackInventoryChange = (trackInventory: boolean) => {
    if (trackInventory) {
      const toInt = (s: string) => {
        const n = parseStockNum(s)
        return n < 0 ? '' : String(n)
      }
      patch({
        trackInventory,
        stock: '0',
        minStock: toInt(form.minStock),
        maxStock: toInt(form.maxStock),
      })
      return
    }

    const sku = (inventoryContextSku ?? form.sku).trim()
    if (!sku || !form.trackInventory) {
      applyDisableTrackInventory()
      return
    }

    setDisableTrackLoading(true)
    void (async () => {
      try {
        const summary = await resolveProductInventoryStockSummary(sku)
        if (!hasInventoryPositions(summary)) {
          applyDisableTrackInventory()
          return
        }
        setDisableTrackSummary(summary)
        setDisableTrackDialogOpen(true)
      } catch {
        setDisableTrackSummary({ positionCount: 1, onHandQty: 0, availableQty: 0, reservedQty: 0 })
        setDisableTrackDialogOpen(true)
      } finally {
        setDisableTrackLoading(false)
      }
    })()
  }

  const minStockInputValue = inventoryQuantityInputValue(form.minStock, form.trackInventory)
  const maxStockInputValue = inventoryQuantityInputValue(form.maxStock, form.trackInventory)

  const showPhysical =
    form.productType === 'Físico' || form.productType === 'Combo'
  const showDigital =
    form.productType === 'Digital' ||
    form.productType === 'Suscripción' ||
    form.productType === 'Servicio'

  return (
    <div className="space-y-6">
      {showImage ? (
        <ContactFormField id="pd-image" label="Imagen del producto">
          <AvatarImageUpload
            value={form.imageUrl}
            onChange={(imageUrl) => patch({ imageUrl })}
            fallbackLabel={form.name || 'Producto'}
            shape="rounded"
            size="lg"
            uploadLabel="Subir foto"
          />
        </ContactFormField>
      ) : null}

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Identificación</h4>
        <ContactFormInput
          id="pd-form-name"
          label="Nombre"
          inputVariant="alphanumeric"
          value={form.name}
          onChange={(name) => patch({ name })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <ContactFormInput
            id="pd-form-sku"
            label="SKU / código interno"
            inputVariant="alphanumeric"
            value={form.sku}
            onChange={(sku) => patch({ sku })}
          />
          <ContactFormInput
            id="pd-form-barcode"
            label="Código de barras"
            inputVariant="alphanumeric"
            value={form.barcode}
            onChange={(barcode) => patch({ barcode })}
            placeholder="EAN / UPC (opcional)"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ContactFormSelect
            id="pd-form-type"
            label="Tipo de producto"
            value={form.productType}
            onChange={(productType) =>
              patch({ productType: productType as ProductFormValues['productType'] })
            }
            options={PRODUCT_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
          />
          <ContactFormSelect
            id="pd-form-category"
            label="Categoría"
            value={form.category}
            onChange={(category) =>
              patch({
                category,
                subcategory: '',
              })
            }
            options={categoryOptions.map((c) => ({ value: c, label: c }))}
          />
          <ContactFormSelect
            id="pd-form-subcategory"
            label="Subcategoría (opcional)"
            value={form.subcategory}
            onChange={(subcategory) => patch({ subcategory })}
            disabled={subcategoryOptions.length === 0}
            options={[
              { value: '', label: 'Sin subcategoría' },
              ...subcategoryOptions.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
        <UserLookupField
          label="Responsable del producto"
          value={form.ownerName}
          onChange={(ownerName) => patch({ ownerName })}
        />
        <ContactFormInput
          id="pd-form-brand"
          label="Marca"
          inputVariant="alphanumeric"
          value={form.brand}
          onChange={(brand) => patch({ brand })}
        />
        {!compact ? (
          <ContactFormInput
            id="pd-form-short"
            label="Descripción corta"
            inputVariant="alphanumeric"
            value={form.shortDescription}
            onChange={(shortDescription) => patch({ shortDescription })}
          />
        ) : null}
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Precios y unidad</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <ContactFormSelect
            id="pd-form-uom"
            label="Unidad de medida"
            value={form.unitOfMeasure}
            onChange={(unitOfMeasure) => patch({ unitOfMeasure })}
            options={UNIT_OF_MEASURE_OPTIONS.map((u) => ({
              value: u.value,
              label: u.label,
            }))}
          />
          {form.unitOfMeasure === 'otra' ? (
            <ContactFormInput
              id="pd-form-custom-uom"
              label="Unidad personalizada"
              inputVariant="alphanumeric"
              value={form.customUnit}
              onChange={(customUnit) => patch({ customUnit })}
              placeholder="ej. bandeja, atado"
            />
          ) : (
            <ContactFormSelect
              id="pd-form-billing"
              label="Periodo de cobro"
              value={form.billingPeriod}
              onChange={(billingPeriod) =>
                patch({ billingPeriod: billingPeriod as ProductFormValues['billingPeriod'] })
              }
              options={BILLING_PERIOD_OPTIONS.map((b) => ({ value: b, label: b }))}
            />
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ContactFormSelect
            id="pd-form-price-currency"
            label="Moneda del precio"
            value={form.priceCurrency}
            onChange={(priceCurrency) => {
              const next = priceCurrency as ProductFormValues['priceCurrency']
              const amount = parseProductPrice(form.price, form.priceCurrency)
              patch({
                priceCurrency: next,
                price: formatProductPriceAmount(amount, next, { allowEmpty: true }),
              })
            }}
            options={PRODUCT_CURRENCIES.map((c) => ({
              value: c,
              label: PRODUCT_CURRENCY_LABELS[c],
            }))}
          />
          <ProductPriceInput
            id="pd-form-price"
            label="Precio de venta"
            currency={form.priceCurrency}
            value={form.price}
            onChange={(price) => patch({ price })}
          />
          <ContactFormSelect
            id="pd-form-status"
            label="Estado"
            value={form.status}
            onChange={(status) => patch({ status: status as ProductStatus })}
            options={['Activo', 'Agotado', 'Borrador'].map((s) => ({ value: s, label: s }))}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Inventario</h4>
        <ContactFormCheckbox
          id="pd-form-track-inv"
          label="Controlar stock de este producto"
          checked={form.trackInventory}
          disabled={disableTrackLoading}
          onChange={handleTrackInventoryChange}
        />
        {form.trackInventory ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <ContactFormInput
                id="pd-form-min"
                label="Stock mínimo"
                inputVariant="integer"
                value={minStockInputValue}
                onChange={(minStock) => patch({ minStock })}
                placeholder="0"
              />
              <ContactFormInput
                id="pd-form-max"
                label="Stock máximo"
                inputVariant="integer"
                value={maxStockInputValue}
                onChange={(maxStock) => patch({ maxStock })}
                placeholder="0"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              El stock en bodega inicia en 0 al crear el producto y se actualiza con ingresos,
              ventas y ajustes en Inventario.
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Sin control de stock numérico (servicios, digitales u otros sin bodega).
          </p>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Integración externa</h4>
        <p className="text-xs text-muted-foreground">
          Controla si el producto aparece en el catálogo de integración (API por tenant) y si
          incluye precio en la respuesta JSON.
        </p>
        <ContactFormCheckbox
          id="pd-form-publish-integration"
          label="Publicar en integración"
          checked={form.publishInIntegration}
          onChange={(publishInIntegration) => {
            if (publishInIntegration) {
              patch({
                publishInIntegration: true,
                publishPriceInIntegration: true,
              })
              return
            }
            patch({
              publishInIntegration: false,
              publishPriceInIntegration: false,
            })
          }}
        />
        {form.publishInIntegration ? (
          <ContactFormCheckbox
            id="pd-form-publish-price"
            label="Publicar precio"
            checked={form.publishPriceInIntegration}
            onChange={(publishPriceInIntegration) => patch({ publishPriceInIntegration })}
          />
        ) : null}
      </div>

      {showPhysical ? (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Medidas y peso</h4>
            <div className="grid grid-cols-4 gap-2">
              <ContactFormInput
                id="pd-form-l"
                label="Largo"
                inputVariant="integer"
                value={form.length}
                onChange={(length) => patch({ length })}
              />
              <ContactFormInput
                id="pd-form-w"
                label="Ancho"
                inputVariant="integer"
                value={form.width}
                onChange={(width) => patch({ width })}
              />
              <ContactFormInput
                id="pd-form-h"
                label="Alto"
                inputVariant="integer"
                value={form.height}
                onChange={(height) => patch({ height })}
              />
              <ContactFormSelect
                id="pd-form-dim-u"
                label="Unidad"
                value={form.dimensionUnit}
                onChange={(dimensionUnit) => patch({ dimensionUnit })}
                options={DIMENSION_UNIT_OPTIONS.map((u) => ({ value: u, label: u }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ContactFormInput
                id="pd-form-weight"
                label="Peso"
                value={form.weight}
                onChange={(weight) => patch({ weight })}
              />
              <ContactFormSelect
                id="pd-form-weight-u"
                label="Unidad de peso"
                value={form.weightUnit}
                onChange={(weightUnit) => patch({ weightUnit })}
                options={WEIGHT_UNIT_OPTIONS.map((u) => ({ value: u, label: u }))}
              />
            </div>
          </div>
        </>
      ) : null}

      {showDigital && !compact ? (
        <>
          <Separator />
          <ContactFormField id="pd-form-license" label="Términos de licencia / servicio">
            <textarea
              id="pd-form-license"
              rows={3}
              value={form.licenseTerms}
              onChange={(e) => patch({ licenseTerms: e.target.value })}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Renovación, usuarios incluidos, SLA…"
            />
          </ContactFormField>
        </>
      ) : null}

      {!compact ? (
        <ContactFormField id="pd-form-desc" label="Descripción">
          <textarea
            id="pd-form-desc"
            rows={4}
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </ContactFormField>
      ) : null}

      <Dialog
        open={disableTrackDialogOpen}
        onOpenChange={(open) => {
          setDisableTrackDialogOpen(open)
          if (!open) setDisableTrackSummary(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {disableTrackSummary && hasSignificantInventoryStock(disableTrackSummary)
                ? 'Quitar control de stock'
                : 'Eliminar registro de inventario'}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {disableTrackSummary && hasSignificantInventoryStock(disableTrackSummary) ? (
                  <>
                    <p>
                      Este producto tiene stock en inventario (
                      {formatProductInventoryStockSummary(disableTrackSummary)}).
                    </p>
                    <p>
                      Al quitar el control de stock se eliminarán las posiciones en bodega, los
                      movimientos y las reservas asociadas a este SKU. Esta acción no se puede
                      deshacer.
                    </p>
                  </>
                ) : (
                  <p>
                    Se eliminará el registro de inventario de este producto (sin unidades en
                    bodega). Los movimientos históricos también se borrarán.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDisableTrackDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant={
                disableTrackSummary && hasSignificantInventoryStock(disableTrackSummary)
                  ? 'destructive'
                  : 'default'
              }
              onClick={applyDisableTrackInventory}
            >
              Quitar control de stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
