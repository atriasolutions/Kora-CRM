import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import {
  createProductVariantsApi,
  listProductVariantsApi,
} from '@/api/products'
import { apiActionErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ProductDetail } from '@/data/product-detail.mock'
import type { ProductListItem } from '@/data/products.mock'
import {
  generateVariantCombinations,
  normalizeVariantOptions,
  suggestVariantSku,
  type VariantOption,
} from '@/lib/product-variants'
import { toast } from '@/lib/toast'

type ProductVariantsPanelProps = {
  product: ProductDetail
  canEdit: boolean
  onChanged: () => void
}

export function ProductVariantsPanel({
  product,
  canEdit,
  onChanged,
}: ProductVariantsPanelProps) {
  const [options, setOptions] = useState<VariantOption[]>(
    () =>
      product.variantOptions?.length
        ? product.variantOptions
        : [{ name: 'Color', values: [''] }, { name: 'Talla', values: [''] }],
  )
  const [variants, setVariants] = useState<ProductListItem[]>(
    () => product.variants ?? [],
  )
  const [saving, setSaving] = useState(false)

  const previewCount = useMemo(() => {
    const normalized = normalizeVariantOptions(options)
    return generateVariantCombinations(normalized).length
  }, [options])

  async function refreshVariants() {
    const items = await listProductVariantsApi(product.id)
    setVariants(items)
  }

  function updateOptionName(index: number, name: string) {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, name } : opt)),
    )
  }

  function updateOptionValues(index: number, raw: string) {
    const values = raw.split(',').map((v) => v.trim())
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, values } : opt)),
    )
  }

  function addOption() {
    setOptions((prev) => [...prev, { name: '', values: [''] }])
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleGenerate() {
    const normalized = normalizeVariantOptions(options)
    if (normalized.length === 0) {
      toast.error('Define al menos una opción con valores')
      return
    }
    if (previewCount > 100) {
      toast.error('Demasiadas combinaciones (máx. 100)')
      return
    }
    setSaving(true)
    try {
      const created = await createProductVariantsApi(product.id, {
        options: normalized,
      })
      toast.success(
        created.length === 1
          ? '1 variedad creada'
          : `${created.length} variedades creadas`,
      )
      await refreshVariants()
      onChanged()
    } catch (e) {
      toast.error(apiActionErrorMessage(e, 'No se pudieron crear las variedades'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Opciones de variación
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ej.: Color = Negro, Rojo · Talla = S, M, L. Se generarán todas las
              combinaciones con SKU propio.
            </p>
          </div>
          {canEdit ? (
            <Button type="button" variant="outline" size="sm" onClick={addOption}>
              <Plus className="size-3.5" />
              Opción
            </Button>
          ) : null}
        </div>

        <div className="space-y-3">
          {options.map((opt, index) => (
            <div
              key={`opt-${index}`}
              className="grid gap-2 sm:grid-cols-[140px_1fr_auto] items-end"
            >
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Nombre</span>
                <Input
                  value={opt.name}
                  disabled={!canEdit}
                  placeholder="Color"
                  onChange={(e) => updateOptionName(index, e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Valores (separados por coma)
                </span>
                <Input
                  value={opt.values.join(', ')}
                  disabled={!canEdit}
                  placeholder="Negro, Rojo, Amarillo"
                  onChange={(e) => updateOptionValues(index, e.target.value)}
                />
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  onClick={() => removeOption(index)}
                  disabled={options.length <= 1}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>

        {canEdit ? (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button type="button" onClick={() => void handleGenerate()} disabled={saving}>
              {saving
                ? 'Creando…'
                : previewCount > 0
                  ? `Generar ${previewCount} variedad${previewCount === 1 ? '' : 'es'}`
                  : 'Generar variedades'}
            </Button>
            <span className="text-xs text-muted-foreground">
              SKU sugerido ej.:{' '}
              {suggestVariantSku(product.sku, { Color: 'Rojo', Talla: 'M' }, [
                'Color',
                'Talla',
              ])}
            </span>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">
            Variedades ({variants.length})
          </h3>
        </div>
        {variants.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground text-center">
            Aún no hay variedades. Define opciones y genera la matriz.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Variedad</th>
                  <th className="px-4 py-2 font-medium">SKU</th>
                  <th className="px-4 py-2 font-medium">Precio</th>
                  <th className="px-4 py-2 font-medium">Stock</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      <Link
                        to={`/productos/${v.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {v.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{v.sku}</td>
                    <td className="px-4 py-2">{v.price}</td>
                    <td className="px-4 py-2">{v.stock}</td>
                    <td className="px-4 py-2">{v.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
