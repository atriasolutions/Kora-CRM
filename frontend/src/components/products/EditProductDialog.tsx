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
import type { ProductDetail } from '@/data/product-detail.mock'
import {
  applyFormValuesToProduct,
  productDetailToFormValues,
  productFormValuesToCreateSlice,
  type ProductFormValues,
} from '@/lib/product-form'
import { validateCreateProductForm } from '@/lib/product-create'
import { useProductsRegistry } from '@/hooks/use-products-registry'

type EditProductDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductDetail
  onSave: (updated: ProductDetail, previousSku?: string) => Promise<void>
}

export function EditProductDialog({
  open,
  onOpenChange,
  product,
  onSave,
}: EditProductDialogProps) {
  const { allProducts } = useProductsRegistry()
  const [form, setForm] = useState<ProductFormValues>(() =>
    productDetailToFormValues(product),
  )
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setForm(productDetailToFormValues(product))
      setSaving(false)
      setSubmitError(null)
    })
  }, [open, product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.warning('El nombre del producto es obligatorio.')
      return
    }
    if (!form.sku.trim()) {
      toast.warning('El SKU es obligatorio.')
      return
    }
    const skuValidation = validateCreateProductForm(
      productFormValuesToCreateSlice(form),
      { existingProducts: allProducts, excludeProductId: product.id },
    )
    if (skuValidation) {
      toast.warning(skuValidation)
      return
    }
    setSaving(true)
    setSubmitError(null)
    try {
      const updated = applyFormValuesToProduct(product, form)
      await onSave(updated, product.sku)
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
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar producto</DialogTitle>
          <DialogDescription>
            Modifica la ficha de {product.name}: catálogo, precios e inventario.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
          <ProductFormFields
            form={form}
            inventoryContextSku={product.sku}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          />
          {submitError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          ) : null}

          <DialogFooter className="gap-2 border-t border-border pt-4 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
