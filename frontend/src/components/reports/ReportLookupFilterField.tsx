import { Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

import { ContactFormField } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type ReportLookupFilterFieldProps = {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  disabled?: boolean
}

export function ReportLookupFilterField({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: ReportLookupFilterFieldProps) {
  const generatedId = useId()
  const inputId = `report-lookup-filter-${generatedId.replace(/:/g, '')}`
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [blockAutofill, setBlockAutofill] = useState(true)

  const selected = useMemo(
    () => options.find((o) => o.value === value.trim()),
    [options, value],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options.slice(0, 15)
    return options
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          o.value.toLowerCase().includes(q),
      )
      .slice(0, 15)
  }, [options, query])

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

  const selectOption = (optionValue: string) => {
    onChange(optionValue)
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
    <ContactFormField label={label} id={inputId}>
      <div ref={containerRef} className="relative">
        {selected && !open ? (
          <div
            className={cn(
              'flex items-center gap-2 rounded-md border border-input bg-background px-2 py-1.5 shadow-sm',
              disabled && 'opacity-60',
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {selected.label}
              </p>
              <p className="truncate text-xs text-muted-foreground">{selected.value}</p>
            </div>
            {!disabled ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 shrink-0"
                aria-label="Quitar selección"
                onClick={clearSelection}
              >
                <X aria-hidden className="size-4" />
              </Button>
            ) : null}
            {!disabled ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => setOpen(true)}
              >
                Cambiar
              </Button>
            ) : null}
          </div>
        ) : null}

        {showSearchInput ? (
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id={inputId}
              name={inputId}
              type="search"
              autoComplete="off"
              readOnly={blockAutofill}
              disabled={disabled}
              placeholder="Buscar registro…"
              value={query}
              className="pl-9"
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
        ) : null}

        {open && !disabled ? (
          <ul
            className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
            role="listbox"
          >
            {results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                Sin resultados
              </li>
            ) : (
              results.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => selectOption(o.value)}
                  >
                    <span className="font-medium text-foreground">{o.label}</span>
                    <span className="text-xs text-muted-foreground">{o.value}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </ContactFormField>
  )
}
