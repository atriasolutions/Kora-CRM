import { Copy, Search } from 'lucide-react'
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
import type { CompanyListItem } from '@/data/companies.mock'
import { cn } from '@/lib/utils'

type DuplicateCompanyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  companies: CompanyListItem[]
  onSelectDuplicate: (source: CompanyListItem) => void
}

export function DuplicateCompanyDialog({
  open,
  onOpenChange,
  companies,
  onSelectDuplicate,
}: DuplicateCompanyDialogProps) {
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
    if (!q) return companies.slice(0, 20)
    return companies
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q),
      )
      .slice(0, 20)
  }, [companies, query])

  const selected = companies.find((c) => c.id === selectedId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicar empresa</DialogTitle>
          <DialogDescription>
            Elige una empresa existente. Se abrirá el formulario con sus datos para
            ajustarlos antes de guardar.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="ps-10"
            placeholder="Buscar por nombre, industria o ciudad…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar empresa a duplicar"
          />
        </div>

        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No se encontraron empresas.
            </li>
          ) : (
            filtered.map((company) => {
              const isSelected = company.id === selectedId
              return (
                <li key={company.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(company.id)}
                    className={cn(
                      'flex w-full flex-col rounded-md px-3 py-2 text-start text-sm transition-colors',
                      isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/60',
                    )}
                  >
                    <p className="font-medium text-foreground">{company.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {company.industry} · {company.city}
                    </p>
                  </button>
                </li>
              )
            })
          )}
        </ul>

        {selected ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Copy aria-hidden className="size-3.5" />
            Se creará una copia de{' '}
            <span className="font-medium text-foreground">{selected.name}</span>
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (!selected) return
              onSelectDuplicate(selected)
              onOpenChange(false)
            }}
          >
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
