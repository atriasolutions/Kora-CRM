import { ChevronDown, FileSpreadsheet, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { ContactFormField } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { QuoteListItem } from '@/data/quotes.mock'
import { stampRecordAuditOnCreate } from '@/lib/record-audit'
import { isApiEnabled } from '@/api/config'
import { listQuotesForOpportunityApi } from '@/api/quotes'
import { useQuotesRegistry } from '@/hooks/use-quotes-registry'
import { findQuoteById, searchQuotes } from '@/lib/quote-lookup'
import { cn } from '@/lib/utils'

type QuoteLookupFieldProps = {
  label?: string
  value: string
  onChange: (quoteId: string, quote?: QuoteListItem) => void
  quoteCode?: string
  disabled?: boolean
  /** Solo cotizaciones aceptadas (nueva factura desde módulo). */
  acceptedOnly?: boolean
  /** Limita la búsqueda a cotizaciones de esta oportunidad. */
  opportunityId?: string
  hideHelper?: boolean
  className?: string
}

export function QuoteLookupField({
  label = 'Cotización',
  value: quoteId,
  onChange,
  quoteCode,
  disabled = false,
  acceptedOnly = false,
  opportunityId,
  hideHelper = false,
  className,
}: QuoteLookupFieldProps) {
  const generatedId = useId()
  const inputId = `crm-quote-lookup-${generatedId.replace(/:/g, '')}`
  const inputName = `crm-quote-lookup-field-${generatedId.replace(/:/g, '')}`
  const { allQuotes, reloadFromApi } = useQuotesRegistry()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [blockAutofill, setBlockAutofill] = useState(true)
  const [opportunityQuotes, setOpportunityQuotes] = useState<QuoteListItem[]>([])
  const useApi = isApiEnabled()
  const scopedOpportunityId = opportunityId?.trim() ?? ''

  useEffect(() => {
    if (!scopedOpportunityId) {
      setOpportunityQuotes([])
      return
    }
    if (useApi) {
      let cancelled = false
      void listQuotesForOpportunityApi(scopedOpportunityId)
        .then((items) => {
          if (!cancelled) setOpportunityQuotes(items)
        })
        .catch(() => {
          if (!cancelled) setOpportunityQuotes([])
        })
      return () => {
        cancelled = true
      }
    }
    setOpportunityQuotes(allQuotes.filter((q) => q.opportunityId === scopedOpportunityId))
  }, [scopedOpportunityId, useApi, allQuotes])

  useEffect(() => {
    if (!open) return
    if (allQuotes.length === 0) {
      void reloadFromApi().catch(() => {})
    }
  }, [open, allQuotes.length, reloadFromApi])

  const selected = useMemo(() => {
    const byId = findQuoteById(allQuotes, quoteId)
    if (byId) return byId
    if (quoteId.trim() && quoteCode?.trim()) {
      return stampRecordAuditOnCreate({
        id: quoteId,
        code: quoteCode,
        title: quoteCode,
        opportunityId: '',
        opportunityName: '',
        companyName: '',
        amount: '',
        status: 'Aceptada' as const,
        validUntil: '',
        issueDate: '',
        owner: '',
      }) satisfies QuoteListItem
    }
    return undefined
  }, [allQuotes, quoteId, quoteCode])

  const quotePool = useMemo(
    () => (scopedOpportunityId ? opportunityQuotes : allQuotes),
    [scopedOpportunityId, opportunityQuotes, allQuotes],
  )

  const results = useMemo(
    () =>
      searchQuotes(quotePool, query, {
        statusFilter: acceptedOnly ? 'Aceptada' : undefined,
        opportunityId: scopedOpportunityId || undefined,
        limit: 10,
      }),
    [quotePool, query, acceptedOnly, scopedOpportunityId],
  )

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

  const selectQuote = (quote: QuoteListItem) => {
    onChange(quote.id, quote)
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
              <FileSpreadsheet aria-hidden className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{selected.code}</p>
              <p className="truncate text-xs text-muted-foreground">
                {selected.companyName} · {selected.amount}
              </p>
            </div>
            {!disabled ? (
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Cambiar cotización"
                  onClick={() => {
                    setQuery(selected.code)
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
                  aria-label="Quitar cotización"
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
              placeholder={
                opportunityId?.trim()
                  ? 'Buscar cotización de esta oportunidad…'
                  : 'Buscar cotización por código o empresa…'
              }
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
        {open && showSearchInput ? (
          <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md">
            {results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</li>
            ) : (
              results.map((quote) => (
                <li key={quote.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => selectQuote(quote)}
                  >
                    <span className="font-medium text-foreground">{quote.code}</span>
                    <span className="text-xs text-muted-foreground">
                      {quote.companyName} · {quote.status}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
        {selected && !disabled && !hideHelper ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            <Link to={`/cotizaciones/${selected.id}`} className="text-primary hover:underline">
              Ver cotización
            </Link>
          </p>
        ) : null}
      </div>
    </ContactFormField>
  )
}
