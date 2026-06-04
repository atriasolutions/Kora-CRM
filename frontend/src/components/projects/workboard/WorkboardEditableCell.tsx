import { useEffect, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  formatWorkboardHoursDisplay,
  parseWorkboardHoursInput,
} from '@/lib/project-work-plan'
import { cn } from '@/lib/utils'

type WorkboardEditableCellProps = {
  value: string
  display?: string
  type?: 'text' | 'number' | 'date'
  placeholder?: string
  readOnly?: boolean
  className?: string
  inputClassName?: string
  /** Solo para `type="number"`. Por defecto 0. */
  numberMin?: number
  numberStep?: number
  /** Solo para `type="date"` (formato yyyy-MM-dd). */
  dateMin?: string
  dateMax?: string
  onSave: (value: string) => void
}

export function WorkboardEditableCell({
  value,
  display,
  type = 'text',
  placeholder = '—',
  readOnly = false,
  className,
  inputClassName,
  numberMin = 0,
  numberStep = 0.25,
  dateMin,
  dateMax,
  onSave,
}: WorkboardEditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = () => {
    setEditing(false)
    const next =
      type === 'number'
        ? formatWorkboardHoursDisplay(parseWorkboardHoursInput(draft))
        : draft
    if (next !== draft) setDraft(next)
    if (next !== value) onSave(next)
  }

  const handleNumberChange = (raw: string) => {
    if (raw.startsWith('-')) return
    setDraft(raw)
  }

  const shown = display ?? (value.trim() || placeholder)

  if (readOnly) {
    return (
      <span className={cn('block min-h-8 truncate py-1.5 text-foreground', className)}>
        {shown}
      </span>
    )
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={cn(
          'flex min-h-8 w-full items-center rounded-md px-1.5 py-1 text-start text-foreground',
          'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          !value.trim() && 'text-muted-foreground',
          className,
        )}
        onClick={() => setEditing(true)}
      >
        <span className="truncate">{shown}</span>
      </button>
    )
  }

  return (
    <Input
      ref={inputRef}
      type={type}
      value={draft}
      min={type === 'number' ? numberMin : type === 'date' ? dateMin : undefined}
      max={type === 'date' ? dateMax : undefined}
      step={type === 'number' ? numberStep : undefined}
      inputMode={type === 'number' ? 'decimal' : undefined}
      className={cn(
        'h-8 shadow-sm',
        type === 'number' ? 'min-w-[4.75rem] w-full px-2 text-xs' : 'px-1.5 text-xs',
        type === 'number' &&
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        inputClassName,
      )}
      onChange={(e) =>
        type === 'number' ? handleNumberChange(e.target.value) : setDraft(e.target.value)
      }
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        }
        if (e.key === 'Escape') {
          setDraft(value)
          setEditing(false)
        }
      }}
    />
  )
}
