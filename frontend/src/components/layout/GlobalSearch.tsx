import {
  Building2,
  FileText,
  FolderKanban,
  Loader2,
  Package,
  Receipt,
  Search,
  ShoppingCart,
  Target,
  UserRound,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { globalSearchApi } from '@/api/search'
import { Input } from '@/components/ui/input'
import { useMenuAccess } from '@/hooks/use-menu-access'
import {
  GLOBAL_SEARCH_TYPE_LABELS,
  globalSearchResultPath,
} from '@/lib/global-search-paths'
import { filterGlobalSearchResults, SEARCH_ENTITY_MODULE_MAP } from '@/lib/global-search-access'
import type { GlobalSearchEntityType, GlobalSearchResult } from '@/types/global-search'
import { cn } from '@/lib/utils'

const MIN_QUERY_LENGTH = 2

const TYPE_ICONS: Record<GlobalSearchEntityType, typeof UserRound> = {
  contact: UserRound,
  company: Building2,
  opportunity: Target,
  quote: FileText,
  invoice: Receipt,
  activity: Zap,
  project: FolderKanban,
  product: Package,
  purchase: ShoppingCart,
}

function groupResults(results: GlobalSearchResult[]) {
  const order: GlobalSearchEntityType[] = [
    'contact',
    'company',
    'opportunity',
    'quote',
    'invoice',
    'activity',
    'project',
    'product',
    'purchase',
  ]
  const map = new Map<GlobalSearchEntityType, GlobalSearchResult[]>()
  for (const item of results) {
    const list = map.get(item.type) ?? []
    list.push(item)
    map.set(item.type, list)
  }
  return order
    .filter((type) => map.has(type))
    .map((type) => ({
      type,
      label: GLOBAL_SEARCH_TYPE_LABELS[type],
      items: map.get(type)!,
    }))
}

export function GlobalSearch() {
  const navigate = useNavigate()
  const { can } = useMenuAccess()
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 280)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (event.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([])
      setLoading(false)
      setActiveIndex(-1)
      return
    }

    let cancelled = false
    setLoading(true)

    const run = async () => {
      try {
        const data = await globalSearchApi(debouncedQuery)
        if (!cancelled) {
          const filtered = filterGlobalSearchResults(data.results, (moduleId) =>
            can(moduleId, 'view'),
          )
          setResults(filtered)
          setActiveIndex(filtered.length > 0 ? 0 : -1)
        }
      } catch {
        if (!cancelled) {
          setResults([])
          setActiveIndex(-1)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, can])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        panelRef.current?.contains(target) ||
        inputRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const searchPlaceholder = useMemo(() => {
    const labels = Object.entries(GLOBAL_SEARCH_TYPE_LABELS)
      .filter(([type]) => can(SEARCH_ENTITY_MODULE_MAP[type as GlobalSearchEntityType], 'view'))
      .map(([, label]) => label.toLowerCase())
    if (labels.length === 0) return 'Buscar…'
    if (labels.length === 1) return `Buscar ${labels[0]}…`
    if (labels.length <= 3) return `Buscar ${labels.join(', ')}…`
    return 'Buscar en tus módulos…'
  }, [can])
  const groups = useMemo(() => groupResults(results), [results])
  const flatResults = useMemo(() => groups.flatMap((g) => g.items), [groups])

  const goTo = useCallback(
    (item: GlobalSearchResult) => {
      navigate(globalSearchResultPath(item.type, item.id))
      setOpen(false)
      setQuery('')
      setResults([])
      inputRef.current?.blur()
    },
    [navigate],
  )

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || flatResults.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % flatResults.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev <= 0 ? flatResults.length - 1 : prev - 1))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      const item = flatResults[activeIndex]
      if (item) goTo(item)
    }
  }

  return (
    <div ref={panelRef} className="relative min-w-0 flex-1 lg:max-w-md xl:mx-auto xl:max-w-lg">
      <Search
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="search"
        placeholder={searchPlaceholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={cn(
          'h-9 rounded-xl border border-border/60 bg-muted/30 ps-9 text-sm shadow-none',
          'placeholder:text-muted-foreground/70',
          'transition-[box-shadow,background-color,border-color]',
          'hover:border-primary/20 hover:bg-background',
          'focus-visible:border-primary/30 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/15',
          'sm:pe-[4.5rem]',
        )}
        aria-label="Buscar en el CRM"
        aria-expanded={open}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        role="combobox"
      />
      <span className="pointer-events-none absolute end-2.5 top-1/2 hidden -translate-y-1/2 sm:inline-flex">
        <kbd className="rounded border border-border/60 bg-background/80 px-1.5 py-0.5 font-sans text-[10px] font-medium tracking-wide text-muted-foreground">
          ⌘K
        </kbd>
      </span>

      {open && (query.length > 0 || results.length > 0) ? (
        <div
          id="global-search-results"
          role="listbox"
          className={cn(
            'absolute start-0 end-0 top-[calc(100%+0.35rem)] z-50 max-h-[min(70vh,24rem)] overflow-y-auto',
            'rounded-xl border border-border bg-popover p-1 shadow-lg',
          )}
        >
          {query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              Escribe al menos {MIN_QUERY_LENGTH} caracteres…
            </p>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Buscando…
            </div>
          ) : null}

          {!loading && debouncedQuery.length >= MIN_QUERY_LENGTH && results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Sin resultados para «{debouncedQuery}».
            </p>
          ) : null}

          {!loading
            ? (() => {
                let rowOffset = 0
                return groups.map((group) => (
                  <div key={group.type} className="py-1">
                    <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </p>
                    <ul>
                      {group.items.map((item) => {
                        const index = rowOffset
                        rowOffset += 1
                        const Icon = TYPE_ICONS[item.type]
                        const isActive = index === activeIndex
                        return (
                          <li key={`${item.type}-${item.id}`}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={isActive}
                              className={cn(
                                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm transition-colors',
                                isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/70',
                              )}
                              onMouseEnter={() => setActiveIndex(index)}
                              onClick={() => goTo(item)}
                            >
                              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <Icon aria-hidden className="size-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{item.title}</span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {item.subtitle}
                                </span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))
              })()
            : null}
        </div>
      ) : null}
    </div>
  )
}
