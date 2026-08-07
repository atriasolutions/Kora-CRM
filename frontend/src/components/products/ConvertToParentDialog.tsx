import { useMemo, useState } from 'react'

import { convertProductToParentApi } from '@/api/products'
import { apiActionErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { ProductListItem } from '@/data/products.mock'
import {
  normalizeVariantOptions,
  suggestVariantSku,
  type VariantOption,
} from '@/lib/product-variants'
import { toast } from '@/lib/toast'

type ConvertToParentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductListItem
  onConverted: (parent: ProductListItem) => void
}

export function ConvertToParentDialog({
  open,
  onOpenChange,
  product,
  onConverted,
}: ConvertToParentDialogProps) {
  const [options, setOptions] = useState<VariantOption[]>([
    { name: 'Color', values: [''] },
    { name: 'Talla', values: [''] },
  ])
  const [firstAttrs, setFirstAttrs] = useState<Record<string, string>>({
    Color: '',
    Talla: '',
  })
  const [saving, setSaving] = useState(false)

  const suggestedSku = useMemo(() => {
    const normalized = normalizeVariantOptions(options)
    const order = normalized.map((o) => o.name)
    const attrs: Record<string, string> = {}
    for (const opt of normalized) {
      const v = firstAttrs[opt.name]?.trim()
      if (v) attrs[opt.name] = v
    }
    return suggestVariantSku(product.sku, attrs, order)
  }, [firstAttrs, options, product.sku])

  async function handleSubmit() {
    const normalized = normalizeVariantOptions(options)
    if (normalized.length === 0) {
      toast.error('Define al menos una opción con valores')
      return
    }
    const attrs: Record<string, string> = {}
    for (const opt of normalized) {
      const v = firstAttrs[opt.name]?.trim()
      if (!v) {
        toast.error(`Indica el valor inicial de «${opt.name}»`)
        return
      }
      attrs[opt.name] = v
    }
    setSaving(true)
    try {
      const parent = await convertProductToParentApi(product.id, {
        options: normalized,
        firstVariantAttributes: attrs,
        firstVariantSku: suggestedSku,
      })
      toast.success('Producto convertido a agrupador con variedades')
      onConverted(parent)
      onOpenChange(false)
    } catch (e) {
      toast.error(apiActionErrorMessage(e, 'No se pudo convertir el producto'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Convertir en producto con variedades</DialogTitle>
          <DialogDescription>
            «{product.name}» pasará a ser el agrupador (código {product.sku}). El
            stock y el SKU actuales se moverán a la primera variedad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {options.map((opt, index) => (
            <div key={`copt-${index}`} className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Opción</span>
                <Input
                  value={opt.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setOptions((prev) =>
                      prev.map((o, i) => (i === index ? { ...o, name } : o)),
                    )
                  }}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Valores (coma)
                </span>
                <Input
                  value={opt.values.join(', ')}
                  onChange={(e) => {
                    const values = e.target.value.split(',').map((v) => v.trim())
                    setOptions((prev) =>
                      prev.map((o, i) => (i === index ? { ...o, values } : o)),
                    )
                  }}
                />
              </div>
            </div>
          ))}

          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Primera variedad (hereda stock actual)
            </p>
            {normalizeVariantOptions(options).map((opt) => (
              <div key={opt.name} className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {opt.name}
                </span>
                <Input
                  list={`vals-${opt.name}`}
                  value={firstAttrs[opt.name] ?? ''}
                  onChange={(e) =>
                    setFirstAttrs((prev) => ({
                      ...prev,
                      [opt.name]: e.target.value,
                    }))
                  }
                  placeholder={opt.values[0] || opt.name}
                />
                <datalist id={`vals-${opt.name}`}>
                  {opt.values.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              SKU variedad: <span className="font-mono">{suggestedSku}</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? 'Convirtiendo…' : 'Convertir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
