import { Boxes, Copy, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

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
import { cn } from '@/lib/utils'

type DuplicateProductDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: ProductListItem[]
  onSelectDuplicate: (source: ProductListItem) => void
}

export function DuplicateProductDialog({
  open,
  onOpenChange,
  products,
  onSelectDuplicate,
}: DuplicateProductDialogProps) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setQuery('')
      setSelectedId(null)
    })
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products.slice(0, 20)
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    )
  }, [products, query])

  const handleContinue = () => {
    const source = products.find((p) => p.id === selectedId)
    if (!source) return
    onSelectDuplicate(source)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Duplicar producto</DialogTitle>
          <DialogDescription>Elige el producto que quieres copiar.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="ps-10"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <ul className="max-h-[280px] space-y-1 overflow-y-auto rounded-lg border border-border p-1">
          {filtered.map((prod) => (
            <li key={prod.id}>
              <button
                type="button"
                onClick={() => setSelectedId(prod.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-start text-sm transition-colors hover:bg-accent',
                  selectedId === prod.id && 'bg-accent',
                )}
              >
                <Boxes aria-hidden className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate font-medium">{prod.name}</span>
                <span className="truncate text-xs text-muted-foreground">{prod.sku}</span>
              </button>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={!selectedId} onClick={handleContinue}>
            <Copy aria-hidden className="size-4" />
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
