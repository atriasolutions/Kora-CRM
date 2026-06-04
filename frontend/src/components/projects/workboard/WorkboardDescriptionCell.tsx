import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

type WorkboardDescriptionCellProps = {
  value: string
  readOnly?: boolean
  emptyLabel?: string
  onSave: (value: string) => void
}

export function WorkboardDescriptionCell({
  value,
  readOnly = false,
  emptyLabel = 'Agregar descripción…',
  onSave,
}: WorkboardDescriptionCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (editing) ref.current?.focus()
  }, [editing])

  const commit = () => {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  if (readOnly) {
    return (
      <span className="block min-h-8 max-w-[200px] truncate py-1.5 text-muted-foreground">
        {value.trim() || '—'}
      </span>
    )
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={cn(
          'flex min-h-8 w-full max-w-[220px] items-center rounded-md px-1.5 py-1 text-start',
          'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          value.trim() ? 'text-muted-foreground' : 'text-muted-foreground/70',
        )}
        onClick={() => setEditing(true)}
      >
        <span className="line-clamp-2 text-xs">{value.trim() || emptyLabel}</span>
      </button>
    )
  }

  return (
    <textarea
      ref={ref}
      rows={2}
      value={draft}
      className="w-full max-w-[220px] resize-none rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setDraft(value)
          setEditing(false)
        }
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          commit()
        }
      }}
    />
  )
}
