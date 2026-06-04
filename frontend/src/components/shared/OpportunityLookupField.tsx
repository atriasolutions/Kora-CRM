import { Briefcase, ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { ContactFormField } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import { stampRecordAuditOnCreate } from '@/lib/record-audit'
import { useOpportunitiesRegistry } from '@/hooks/use-opportunities-registry'
import { findOpportunityById, searchOpportunities } from '@/lib/opportunity-lookup'
import { cn } from '@/lib/utils'

type OpportunityLookupFieldProps = {
  label?: string
  value: string
  onChange: (opportunityId: string, opportunity?: OpportunityListItem) => void
  /** Respaldo si el id no está en el catálogo cargado. */
  opportunityName?: string
  disabled?: boolean
  hideHelper?: boolean
  className?: string
}

export function OpportunityLookupField({
  label = 'Oportunidad',
  value: opportunityId,
  onChange,
  opportunityName,
  disabled = false,
  hideHelper = false,
  className,
}: OpportunityLookupFieldProps) {
  const generatedId = useId()
  const inputId = `crm-opp-lookup-${generatedId.replace(/:/g, '')}`
  const inputName = `crm-opp-lookup-field-${generatedId.replace(/:/g, '')}`
  const { allOpportunities, reloadFromApi } = useOpportunitiesRegistry()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [blockAutofill, setBlockAutofill] = useState(true)
  const [catalogLoaded, setCatalogLoaded] = useState(() => allOpportunities.length > 0)

  const selected = useMemo(() => {
    const byId = findOpportunityById(allOpportunities, opportunityId)
    if (byId) return byId
    if (opportunityId.trim() && opportunityName?.trim()) {
      return stampRecordAuditOnCreate({
        id: opportunityId,
        name: opportunityName,
        company: '',
        contactName: '',
        amount: '',
        weightedAmount: '',
        stage: 'Calificados',
        probability: '',
        closeDate: '',
        owner: '',
        type: 'Nuevo negocio',
        priority: 'Media',
        outcome: 'Abierta',
        forecast: 'En pipeline',
        source: '',
        lastActivity: '',
      }) satisfies OpportunityListItem
    }
    return undefined
  }, [allOpportunities, opportunityId, opportunityName])

  const results = useMemo(
    () => searchOpportunities(allOpportunities, query, 10),
    [allOpportunities, query],
  )

  useEffect(() => {
    if (allOpportunities.length > 0) {
      setCatalogLoaded(true)
      return
    }
    let cancelled = false
    void reloadFromApi()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCatalogLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [allOpportunities.length, reloadFromApi])

  useEffect(() => {
    if (!open) return
    void reloadFromApi().catch(() => {})
  }, [open, reloadFromApi])

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

  const selectOpportunity = (opportunity: OpportunityListItem) => {
    onChange(opportunity.id, opportunity)
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

  useEffect(() => {
    if (showSearchInput) setBlockAutofill(true)
  }, [showSearchInput])

  return (
    <ContactFormField label={label} id={inputId} className={className}>
      <div ref={containerRef} className="relative">
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
              'flex items-center gap-2 rounded-md border border-input bg-background px-2 py-1.5 shadow-sm',
              disabled && 'opacity-60',
            )}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
              <Briefcase aria-hidden className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{selected.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {selected.company}
                {selected.contactName ? ` · ${selected.contactName}` : ''}
                {selected.amount ? ` · ${selected.amount}` : ''}
              </p>
            </div>
            {!disabled ? (
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Cambiar oportunidad"
                  onClick={() => {
                    setQuery(selected.name)
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
                  aria-label="Quitar oportunidad"
                  onClick={clearSelection}
                >
                  <X aria-hidden className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="relative">
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
              placeholder="Buscar oportunidad por nombre, empresa o contacto…"
              className="h-9 bg-background ps-8 shadow-sm"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore
              data-form-type="other"
              role="combobox"
              aria-expanded={open}
              aria-controls={`${inputId}-listbox`}
              aria-autocomplete="list"
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

        {open && !disabled ? (
          <ul
            id={`${inputId}-listbox`}
            role="listbox"
            className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
          >
            {!catalogLoaded ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                Cargando oportunidades…
              </li>
            ) : null}
            {catalogLoaded && results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</li>
            ) : null}
            {results.map((opportunity) => (
              <li key={opportunity.id} role="option">
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-muted',
                    opportunity.id === opportunityId && 'bg-muted/80',
                  )}
                  onClick={() => selectOpportunity(opportunity)}
                >
                  <Briefcase
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{opportunity.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {opportunity.company} · {opportunity.contactName} · {opportunity.stage}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {!hideHelper ? (
        selected && !disabled ? (
          <p className="text-xs text-muted-foreground">
            Vinculada a{' '}
            <Link
              to={`/oportunidades/${selected.id}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {selected.name}
            </Link>
            . El tipo de cliente (B2B/B2C) y los datos comerciales se tomarán de esta oportunidad.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Selecciona la oportunidad comercial. El cliente B2B o B2C se define allí y se aplicará
            automáticamente a la cotización.
          </p>
        )
      ) : null}
    </ContactFormField>
  )
}
