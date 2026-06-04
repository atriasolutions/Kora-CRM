import { Copy, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import type { ContactListItem } from '@/data/contacts.mock'
import { cn } from '@/lib/utils'

type DuplicateContactDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: ContactListItem[]
  onSelectDuplicate: (source: ContactListItem) => void
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

export function DuplicateContactDialog({
  open,
  onOpenChange,
  contacts,
  onSelectDuplicate,
}: DuplicateContactDialogProps) {
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
    if (!q) return contacts.slice(0, 20)
    return contacts
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q),
      )
      .slice(0, 20)
  }, [contacts, query])

  const selected = contacts.find((c) => c.id === selectedId)

  const handleContinue = () => {
    if (!selected) return
    onSelectDuplicate(selected)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicar contacto</DialogTitle>
          <DialogDescription>
            Elige un contacto existente. Se abrirá el formulario con sus datos para
            que puedas ajustarlos antes de guardar.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="ps-10"
            placeholder="Buscar por nombre, empresa o email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar contacto a duplicar"
          />
        </div>

        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No se encontraron contactos.
            </li>
          ) : (
            filtered.map((contact) => {
              const isSelected = contact.id === selectedId
              return (
                <li key={contact.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(contact.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-start text-sm transition-colors',
                      isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/60',
                    )}
                  >
                    <Avatar className="size-9 border border-border">
                      <AvatarImage src={contact.avatarUrl} alt={contact.name} />
                      <AvatarFallback>{initials(contact.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{contact.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {contact.company} · {contact.email}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })
          )}
        </ul>

        {selected ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Copy aria-hidden className="size-3.5" />
            Se creará una copia de <span className="font-medium text-foreground">{selected.name}</span>
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={!selected} onClick={handleContinue}>
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
