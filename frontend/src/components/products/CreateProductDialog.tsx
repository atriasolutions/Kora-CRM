import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { ProductFormFields } from '@/components/products/ProductFormFields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  createDefaultProductFormValues,
  validateCreateProductForm,
  type CreateProductFormValues,
} from '@/lib/product-create'
import { useProductsRegistry } from '@/hooks/use-products-registry'
import {
  productFormValuesToCreateSlice,
  productDefaultTaxRate,
  type ProductFormValues,
} from '@/lib/product-form'
import { getDefaultOwnerName } from '@/lib/user-lookup'
import { inventoryQuantityInputValue } from '@/lib/product-display'

type CreateProductDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  initialValues?: Partial<CreateProductFormValues>
  onSubmit: (values: ProductFormValues) => Promise<void>
}

function createToFormValues(
  values: CreateProductFormValues,
  extra?: Partial<ProductFormValues>,
): ProductFormValues {
  const trackInventory =
    extra?.trackInventory ?? values.productType === 'Físico'
  return {
    name: values.name,
    sku: values.sku,
    category: values.category,
    productType: values.productType,
    unitOfMeasure: values.unitOfMeasure,
    customUnit: values.customUnit,
    price: values.price,
    priceCurrency: extra?.priceCurrency ?? 'CLP',
    costPrice: values.costPrice,
    stock: trackInventory ? '0' : inventoryQuantityInputValue(values.stock, false),
    status: values.status,
    ownerName: values.ownerName ?? getDefaultOwnerName(),
    imageUrl: values.imageUrl ?? '',
    barcode: values.barcode ?? '',
    description: extra?.description ?? '',
    shortDescription: extra?.shortDescription ?? '',
    brand: extra?.brand ?? '',
    internalCode: values.sku,
    billingPeriod: extra?.billingPeriod ?? 'Por unidad',
    taxRate: productDefaultTaxRate(),
    taxIncluded: extra?.taxIncluded ?? true,
    trackInventory,
    minStock: extra?.minStock ?? '',
    maxStock: extra?.maxStock ?? '',
    length: extra?.length ?? '',
    width: extra?.width ?? '',
    height: extra?.height ?? '',
    dimensionUnit: extra?.dimensionUnit ?? 'cm',
    weight: extra?.weight ?? '',
    weightUnit: extra?.weightUnit ?? 'kg',
    requiresRefrigeration: extra?.requiresRefrigeration ?? false,
    shelfLifeDays: extra?.shelfLifeDays ?? '',
    storageNotes: extra?.storageNotes ?? '',
    licenseTerms: extra?.licenseTerms ?? '',
    supplierName: extra?.supplierName ?? '',
    supplierSku: extra?.supplierSku ?? '',
  }
}

export function CreateProductDialog({
  open,
  onOpenChange,
  title = 'Nuevo producto',
  description,
  initialValues,
  onSubmit,
}: CreateProductDialogProps) {
  const { allProducts } = useProductsRegistry()
  const [form, setForm] = useState<ProductFormValues>(() =>
    createToFormValues(createDefaultProductFormValues(initialValues)),
  )
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(createToFormValues(createDefaultProductFormValues(initialValues)))
      setSaving(false)
      setSubmitError(null)
    })
  }, [open, initialValues])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    const validation = validateCreateProductForm(productFormValuesToCreateSlice(form), {
      existingProducts: allProducts,
    })
    if (validation) {
      toast.warning(validation)
      return
    }
    setSaving(true)
    setSubmitError(null)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el producto. Intenta nuevamente.'
      setSubmitError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ??
              'Define nombre, SKU, precio de venta, unidad y si controla stock. El inventario inicia en 0.'}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <ProductFormFields
            form={form}
            onChange={(patch) => {
              setForm((prev) => ({ ...prev, ...patch }))
            }}
            compact
          />
          {submitError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Crear producto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
