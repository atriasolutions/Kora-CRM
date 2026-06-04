import { GripVertical } from 'lucide-react'

import type { DraggableAttributes } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import { cn } from '@/lib/utils'

type WorkboardDragHandleProps = {
  listeners?: SyntheticListenerMap
  attributes?: DraggableAttributes
  label: string
  className?: string
}

export function WorkboardDragHandle({
  listeners,
  attributes,
  label,
  className,
}: WorkboardDragHandleProps) {
  return (
    <button
      type="button"
      className={cn(
        'grid size-7 shrink-0 cursor-grab place-items-center rounded-md text-muted-foreground touch-none',
        'hover:bg-muted hover:text-foreground active:cursor-grabbing',
        className,
      )}
      aria-label={label}
      {...attributes}
      {...listeners}
    >
      <GripVertical aria-hidden className="size-4" />
    </button>
  )
}
