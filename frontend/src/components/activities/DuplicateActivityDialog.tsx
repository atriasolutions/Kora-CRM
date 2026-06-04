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
import type { ActivityListItem } from '@/data/activities.mock'
import { activityTypeColors, activityTypeIcons } from '@/lib/activity-icons'
import { cn } from '@/lib/utils'

type DuplicateActivityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  activities: ActivityListItem[]
  onSelectDuplicate: (source: ActivityListItem) => void
}

export function DuplicateActivityDialog({
  open,
  onOpenChange,
  activities,
  onSelectDuplicate,
}: DuplicateActivityDialogProps) {
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
    if (!q) return activities.slice(0, 20)
    return activities.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.relatedName.toLowerCase().includes(q) ||
        a.assignee.toLowerCase().includes(q),
    )
  }, [activities, query])

  const handleContinue = () => {
    const source = activities.find((a) => a.id === selectedId)
    if (!source) return
    onSelectDuplicate(source)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Duplicar actividad</DialogTitle>
          <DialogDescription>Elige la actividad que quieres copiar.</DialogDescription>
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
          {filtered.map((act) => {
            const Icon = activityTypeIcons[act.type]
            const colors = activityTypeColors[act.type]
            return (
              <li key={act.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(act.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-start text-sm transition-colors hover:bg-accent',
                    selectedId === act.id && 'bg-accent',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex size-8 shrink-0 items-center justify-center rounded-lg',
                      colors.bg,
                    )}
                  >
                    <Icon aria-hidden className={cn('size-4', colors.color)} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{act.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{act.due}</span>
                </button>
              </li>
            )
          })}
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
