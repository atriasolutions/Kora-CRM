import { ChevronDown, Search, ShoppingCart, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { ContactFormField } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PurchaseListItem } from '@/data/purchases.mock'
import { stampRecordAuditOnCreate } from '@/lib/record-audit'
import { usePurchasesRegistry } from '@/hooks/use-purchases-registry'
import { findPurchaseById, searchPurchases } from '@/lib/purchase-lookup'
import { cn } from '@/lib/utils'

type PurchaseLookupFieldProps = {
  label?: string
  value: string
  onChange: (purchaseId: string, purchase?: PurchaseListItem) => void
  purchaseReference?: string
  disabled?: boolean
  className?: string
}

export function PurchaseLookupField({
  label = 'Orden de compra',
  value: purchaseId,
  onChange,
  purchaseReference,
  disabled = false,
  className,
}: PurchaseLookupFieldProps) {
  const generatedId = useId()
  const inputId = `crm-pur-lookup-${generatedId.replace(/:/g, '')}`
  const inputName = `crm-pur-lookup-field-${generatedId.replace(/:/g, '')}`
  const { allPurchases } = usePurchasesRegistry()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [blockAutofill, setBlockAutofill] = useState(true)

  const selected = useMemo(() => {
    const byId = findPurchaseById(allPurchases, purchaseId)
    if (byId) return byId
    if (purchaseId.trim() && purchaseReference?.trim()) {
      return stampRecordAuditOnCreate({
        id: purchaseId,
        reference: purchaseReference,
        supplier: '',
        productSummary: '',
        orderDate: '',
        amount: '',
        amountNum: 0,
        status: 'Emitida' as const,
        owner: '',
      }) satisfies PurchaseListItem
    }
    return undefined
  }, [allPurchases, purchaseId, purchaseReference])

  const results = useMemo(
    () => searchPurchases(allPurchases, query, 10),
    [allPurchases, query],
  )

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

  const selectPurchase = (purchase: PurchaseListItem) => {
    onChange(purchase.id, purchase)
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

  return (
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
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
              <ShoppingCart aria-hidden className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {selected.reference}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {selected.supplier}
                {selected.productSummary ? ` · ${selected.productSummary}` : ''}
              </p>
            </div>
            {!disabled ? (
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Cambiar orden de compra"
                  onClick={() => {
                    setQuery(selected.reference)
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
                  aria-label="Quitar orden de compra"
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
              placeholder="Buscar OC por referencia o proveedor…"
              className="h-9 bg-background ps-8 shadow-sm"
              autoComplete="off"
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
        {open && showSearchInput ? (
          <ul
            className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
            role="listbox"
          >
            {results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</li>
            ) : (
              results.map((purchase) => (
                <li key={purchase.id}>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => selectPurchase(purchase)}
                  >
                    <span className="font-medium text-foreground">{purchase.reference}</span>
                    <span className="text-xs text-muted-foreground">
                      {purchase.supplier} · {purchase.status}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
        {selected && !disabled ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            <Link to={`/compras/${selected.id}`} className="text-primary hover:underline">
              Ver orden de compra
            </Link>
          </p>
        ) : null}
      </div>
    </ContactFormField>
  )
}
