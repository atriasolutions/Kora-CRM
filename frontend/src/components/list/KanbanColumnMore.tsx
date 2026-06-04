import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  formatLargeCount,
  KANBAN_COLUMN_LOAD_STEP,
} from '@/lib/large-dataset-view'

type KanbanColumnMoreProps = {
  hiddenCount: number
  onLoadMore: () => void
}

export function KanbanColumnMore({ hiddenCount, onLoadMore }: KanbanColumnMoreProps) {
  if (hiddenCount <= 0) return null

  const step = Math.min(hiddenCount, KANBAN_COLUMN_LOAD_STEP)

  return (
    <li className="pt-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-full text-xs"
        onClick={onLoadMore}
      >
        <ChevronDown aria-hidden className="size-3.5" />
        Cargar {formatLargeCount(step)} más
        <span className="text-muted-foreground">
          ({formatLargeCount(hiddenCount)} ocultos)
        </span>
      </Button>
    </li>
  )
}
