import { FileSpreadsheet, MoreHorizontal } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { KanbanColumnMore } from '@/components/list/KanbanColumnMore'
import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  filterQuotes,
  getQuotesBoardDataset,
  QUOTE_KANBAN_COLUMNS,
} from '@/data/quotes-views.mock'
import type { QuoteListItem } from '@/data/quotes.mock'
import { useQuotesRegistry } from '@/hooks/use-quotes-registry'
import { mergeWithDemoDataset } from '@/lib/demo-dataset'
import { quoteStatusVariant } from '@/lib/quote-display'
import { quoteRowMatchesFilters, type QuoteFilters } from '@/lib/quote-filters'
import {
  quoteMatchesListScope,
  sortQuotesByRecentlyViewed,
  type QuoteListScope,
} from '@/lib/quote-list-scope'
import { quoteKanbanColumn, type QuoteJourneyMainStage } from '@/lib/quote-journey'
import { useKanbanColumnLimits } from '@/hooks/use-kanban-column-limits'
import { KANBAN_COLUMN_SCROLL_CLASS } from '@/lib/large-dataset-view'
import { cn } from '@/lib/utils'

const columnSurface: Record<QuoteJourneyMainStage, string> = {
  Borrador: 'bg-muted/50 dark:bg-muted/20',
  'En revisión interna': 'bg-slate-50/80 dark:bg-slate-950/20',
  Enviada: 'bg-sky-50/80 dark:bg-sky-950/20',
  'En negociación': 'bg-orange-50/80 dark:bg-orange-950/20',
  Aceptada: 'bg-emerald-50/80 dark:bg-emerald-950/20',
}

type QuotesKanbanViewProps = {
  query: string
  filters: QuoteFilters
  listScope: QuoteListScope
  recentIds: string[]
}

export function QuotesKanbanView({
  query,
  filters,
  listScope,
  recentIds,
}: QuotesKanbanViewProps) {
  const navigate = useNavigate()
  const { userQuotes, isArchived } = useQuotesRegistry()

  const quotes = useMemo(() => {
    const all = mergeWithDemoDataset(userQuotes, getQuotesBoardDataset())
    let result = filterQuotes(all, query, (quote) =>
      quoteRowMatchesFilters(quote, filters),
    ).filter(
      (quote) =>
        !isArchived(quote.id) && quoteMatchesListScope(quote, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortQuotesByRecentlyViewed(result, recentIds)
    }
    return result
  }, [query, filters, userQuotes, isArchived, listScope, recentIds])

  const byStatus = useMemo(() => {
    const map: Record<QuoteJourneyMainStage, QuoteListItem[]> = {
      Borrador: [],
      'En revisión interna': [],
      Enviada: [],
      'En negociación': [],
      Aceptada: [],
    }
    quotes.forEach((quote) => {
      map[quoteKanbanColumn(quote.status)].push(quote)
    })
    return map
  }, [quotes])

  const columnKeys = useMemo(() => QUOTE_KANBAN_COLUMNS.map((c) => c.status), [])
  const { sliceForColumn, loadMoreForColumn, hiddenInColumn } = useKanbanColumnLimits(
    columnKeys,
    [quotes.length, query, listScope, filters],
  )

  if (quotes.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <p className="text-sm font-medium text-foreground">
          No hay cotizaciones con los filtros actuales
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={quotes.length}
        entityLabel="cotizaciones"
        viewMode="kanban"
      />
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[min(100%,1200px)] gap-4 lg:min-w-[1200px]">
          {QUOTE_KANBAN_COLUMNS.map(({ status, description }) => {
            const items = byStatus[status]
            const visibleItems = sliceForColumn(status, items)
            return (
              <section
                key={status}
                className={cn(
                  'flex w-[min(100%,280px)] shrink-0 flex-col rounded-xl border border-border',
                  columnSurface[status],
                )}
              >
                <header className="border-b border-border/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">{status}</h2>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>
                </header>
                <ul className={cn('flex flex-1 flex-col gap-2 p-3', KANBAN_COLUMN_SCROLL_CLASS)}>
                  {visibleItems.map((item) => (
                    <li key={item.id}>
                      <article
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/cotizaciones/${item.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') navigate(`/cotizaciones/${item.id}`)
                        }}
                        className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileSpreadsheet aria-hidden className="size-4" />
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal aria-hidden className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Ver detalle</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className="mt-2 font-mono text-sm font-semibold leading-snug text-foreground">
                          {item.code}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.companyName}</p>
                        <p className="mt-2 text-sm font-semibold tabular-nums">{item.amount}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant={quoteStatusVariant(item.status)}>{item.status}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Válida hasta {item.validUntil}
                        </p>
                      </article>
                    </li>
                  ))}
                  <KanbanColumnMore
                    hiddenCount={hiddenInColumn(status, items.length)}
                    onLoadMore={() => loadMoreForColumn(status)}
                  />
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
