import { ChevronDown, Package, Plus, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { CreateProductDialog } from '@/components/products/CreateProductDialog'
import { ContactFormField } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ProductListItem } from '@/data/products.mock'
import { useMenuAccess } from '@/hooks/use-menu-access'
import { useProductsRegistry } from '@/hooks/use-products-registry'
import { createDefaultProductFormValues } from '@/lib/product-create'
import { findLinkedProduct, searchProducts } from '@/lib/product-lookup'
import { cn } from '@/lib/utils'

type ProductLookupFieldProps = {
  label?: string
  value: string
  productName?: string
  /** Resuelve el producto en catálogo cuando el id no está guardado (p. ej. líneas desde OC). */
  productSku?: string
  onChange: (productId: string, product?: ProductListItem) => void
  disabled?: boolean
  className?: string
}

export function ProductLookupField({
  label = 'Producto',
  value: productId,
  productName,
  productSku,
  onChange,
  disabled = false,
  className,
}: ProductLookupFieldProps) {
  const generatedId = useId()
  const inputId = `crm-product-lookup-${generatedId.replace(/:/g, '')}`
  const inputName = `crm-product-lookup-field-${generatedId.replace(/:/g, '')}`
  const { allProducts, addProduct, reloadFromApi } = useProductsRegistry()
  const { can } = useMenuAccess()
  const canCreateProduct = can('productos', 'create')
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [blockAutofill, setBlockAutofill] = useState(true)
  const [catalogLoading, setCatalogLoading] = useState(false)

  const selected = useMemo(
    () =>
      findLinkedProduct(allProducts, {
        id: productId,
        name: productName,
        sku: productSku,
      }),
    [allProducts, productId, productName, productSku],
  )

  const results = useMemo(
    () => searchProducts(allProducts, query, { limit: 10 }),
    [allProducts, query],
  )

  const showCreateOption =
    canCreateProduct &&
    query.trim().length > 0 &&
    !results.some((p) => p.name.toLowerCase() === query.trim().toLowerCase())

  useEffect(() => {
    if (!open) return
    setCatalogLoading(true)
    void reloadFromApi()
      .catch(() => {})
      .finally(() => setCatalogLoading(false))
  }, [open, reloadFromApi])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const selectProduct = (product: ProductListItem) => {
    onChange(product.id, product)
    setQuery('')
    setOpen(false)
  }

  const clearSelection = () => {
    onChange('')
    setQuery('')
    setBlockAutofill(true)
    setOpen(true)
  }

  const showSearchInput = !selected || open

  useEffect(() => {
    if (showSearchInput) setBlockAutofill(true)
  }, [showSearchInput])

  return (
    <>
      <ContactFormField label={label} id={inputId} className={className}>
        <div ref={containerRef} className="relative">
          <input
            type="text"
            tabIndex={-1}
            aria-hidden
            autoComplete="off"
            className="pointer-events-none absolute size-0 opacity-0"
            defaultValue=""
          />
          {selected && !open ? (
            <div
              className={cn(
                'flex items-center gap-2 rounded-md border border-input bg-background px-2 py-1.5 shadow-sm',
                disabled && 'opacity-60',
              )}
            >
              <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-muted">
                {selected.imageUrl ? (
                  <img src={selected.imageUrl} alt="" className="size-full object-cover" />
                ) : (
                  <Package aria-hidden className="size-4 text-muted-foreground" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{selected.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {selected.sku} · {selected.category}
                </p>
              </div>
              {!disabled ? (
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Cambiar producto"
                    onClick={() => {
                      setQuery(selected.name)
                      setBlockAutofill(true)
                      setOpen(true)
                    }}
                  >
                    <ChevronDown aria-hidden className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label="Quitar producto"
                    onClick={clearSelection}
                  >
                    <X aria-hidden className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id={inputId}
                name={inputName}
                type="search"
                value={query}
                disabled={disabled}
                readOnly={blockAutofill && !disabled}
                placeholder="Buscar producto por nombre o SKU…"
                className="h-9 bg-background ps-8 shadow-sm"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore
                data-form-type="other"
                role="combobox"
                aria-expanded={open}
                aria-controls={`${inputId}-listbox`}
                aria-autocomplete="list"
                onFocus={() => {
                  setBlockAutofill(false)
                  setOpen(true)
                }}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setOpen(true)
                }}
              />
            </div>
          )}

          {open && !disabled ? (
            <ul
              id={`${inputId}-listbox`}
              role="listbox"
              className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
            >
              {catalogLoading && results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  Cargando catálogo…
                </li>
              ) : null}
              {!catalogLoading && results.length === 0 && !showCreateOption ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  {query.trim()
                    ? 'Sin resultados'
                    : 'No hay productos en el catálogo. Crea uno o usa «Servicio / otro» en la línea.'}
                </li>
              ) : null}
              {results.map((product) => (
                <li key={product.id} role="option">
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-muted',
                      product.id === productId && 'bg-muted/80',
                    )}
                    onClick={() => selectProduct(product)}
                  >
                    <Package aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{product.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {product.sku} · {product.productType} · {product.category}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {showCreateOption ? (
                <li className="border-t border-border">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm text-primary hover:bg-muted"
                    onClick={() => {
                      setCreateOpen(true)
                      setOpen(false)
                    }}
                  >
                    <Plus aria-hidden className="size-4 shrink-0" />
                    <span>
                      Crear producto «<strong className="font-semibold">{query.trim()}</strong>»
                    </span>
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
        {selected && !disabled ? (
          <p className="text-xs text-muted-foreground">
            Vinculado al catálogo{' '}
            <Link
              to={`/productos/${selected.id}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {selected.name}
            </Link>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Busca en el catálogo; se completarán SKU, precio de compra y unidad.
          </p>
        )}
      </ContactFormField>

      {canCreateProduct ? (
        <CreateProductDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Nuevo producto"
          description="Se agregará al catálogo y a esta línea de la orden."
          initialValues={createDefaultProductFormValues({ name: query.trim() })}
          onSubmit={async (values) => {
            const created = await addProduct(values)
            onChange(created.id, created)
            setQuery('')
          }}
        />
      ) : null}
    </>
  )
}
