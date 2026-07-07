import { ChevronDown, Search, X, type LucideIcon } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { ContactFormField } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type RegistryLookupRow = {
  id: string
  primary: string
  secondary?: string
}

type RegistryEntityLookupFieldProps = {
  label: string
  value: string
  rows: RegistryLookupRow[]
  onChange: (id: string, row?: RegistryLookupRow) => void
  detailPath: (id: string) => string
  placeholder?: string
  disabled?: boolean
  className?: string
  Icon?: LucideIcon
  emptyMessage?: string
}

export function RegistryEntityLookupField({
  label,
  value,
  rows,
  onChange,
  detailPath,
  placeholder = 'Buscar registro…',
  disabled = false,
  className,
  Icon,
  emptyMessage = 'Sin resultados',
}: RegistryEntityLookupFieldProps) {
  const generatedId = useId()
  const inputId = `crm-registry-lookup-${generatedId.replace(/:/g, '')}`
  const inputName = `crm-registry-lookup-field-${generatedId.replace(/:/g, '')}`
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [blockAutofill, setBlockAutofill] = useState(true)

  const selected = useMemo(
    () => rows.find((r) => r.id === value.trim()),
    [rows, value],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows.slice(0, 12)
    return rows
      .filter(
        (r) =>
          r.primary.toLowerCase().includes(q) ||
          (r.secondary?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 12)
  }, [query, rows])

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

  const selectRow = (row: RegistryLookupRow) => {
    onChange(row.id, row)
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
    <ContactFormField label={label} id={inputId} className={cn('w-full min-w-0', className)}>
      <div ref={containerRef} className="relative w-full min-w-0">
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
              'flex w-full min-w-0 items-center gap-2 rounded-md border border-input bg-background px-2 py-1.5 shadow-sm',
              disabled && 'opacity-60',
            )}
          >
            {Icon ? (
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                <Icon aria-hidden className="size-4" />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {selected.primary}
              </p>
              {selected.secondary ? (
                <p className="truncate text-xs text-muted-foreground">
                  {selected.secondary}
                </p>
              ) : null}
            </div>
            {!disabled ? (
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Cambiar registro"
                  onClick={() => {
                    setQuery(selected.primary)
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
                  aria-label="Quitar registro"
                  onClick={clearSelection}
                >
                  <X aria-hidden className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="relative w-full min-w-0">
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
              placeholder={placeholder}
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
        {open && showSearchInput && !disabled ? (
          <ul
            role="listbox"
            className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
          >
            {results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</li>
            ) : (
              results.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => selectRow(row)}
                  >
                    <span className="font-medium text-foreground">{row.primary}</span>
                    {row.secondary ? (
                      <span className="text-xs text-muted-foreground">{row.secondary}</span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
        {selected && !disabled ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            <Link
              to={detailPath(selected.id)}
              className="text-primary underline-offset-2 hover:underline"
            >
              Ver registro
            </Link>
          </p>
        ) : null}
      </div>
    </ContactFormField>
  )
}
