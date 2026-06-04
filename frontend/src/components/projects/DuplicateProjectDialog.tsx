import { Copy, Puzzle, Search } from 'lucide-react'
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
import type { ProjectListItem } from '@/data/projects.mock'
import { cn } from '@/lib/utils'

type DuplicateProjectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: ProjectListItem[]
  onSelectDuplicate: (source: ProjectListItem) => void
}

export function DuplicateProjectDialog({
  open,
  onOpenChange,
  projects,
  onSelectDuplicate,
}: DuplicateProjectDialogProps) {
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
    if (!q) return projects.slice(0, 20)
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.manager.toLowerCase().includes(q),
    )
  }, [projects, query])

  const handleContinue = () => {
    const source = projects.find((p) => p.id === selectedId)
    if (!source) return
    onSelectDuplicate(source)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Duplicar proyecto</DialogTitle>
          <DialogDescription>Elige el proyecto que quieres copiar.</DialogDescription>
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
          {filtered.map((proj) => (
            <li key={proj.id}>
              <button
                type="button"
                onClick={() => setSelectedId(proj.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-start text-sm transition-colors hover:bg-accent',
                  selectedId === proj.id && 'bg-accent',
                )}
              >
                <Puzzle aria-hidden className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate font-medium">{proj.name}</span>
                <span className="truncate text-xs text-muted-foreground">{proj.client}</span>
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
