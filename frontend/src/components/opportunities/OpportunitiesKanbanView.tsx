import { MoreHorizontal, Target } from 'lucide-react'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  filterOpportunities,
  getOpportunitiesBoardDataset,
  OPPORTUNITY_KANBAN_COLUMNS,
} from '@/data/opportunities-views.mock'
import type { OpportunityListItem } from '@/data/opportunities.mock'
import { useOpportunitiesRegistry } from '@/hooks/use-opportunities-registry'
import { opportunityRowMatchesFilters, type OpportunityFilters } from '@/lib/opportunity-filters'
import {
  opportunityMatchesListScope,
  sortOpportunitiesByRecentlyViewed,
  type OpportunityListScope,
} from '@/lib/opportunity-list-scope'
import {
  opportunityKanbanColumn,
  opportunityStageVariant,
  type OpportunityJourneyMainStage,
} from '@/lib/opportunity-journey'
import { mergeWithDemoDataset } from '@/lib/demo-dataset'
import { useKanbanColumnLimits } from '@/hooks/use-kanban-column-limits'
import { KANBAN_COLUMN_SCROLL_CLASS } from '@/lib/large-dataset-view'
import { cn } from '@/lib/utils'

const columnSurface: Record<OpportunityJourneyMainStage, string> = {
  Calificados: 'bg-violet-50/80 dark:bg-violet-950/20',
  'En diagnóstico': 'bg-slate-50/80 dark:bg-slate-950/20',
  Propuesta: 'bg-sky-50/80 dark:bg-sky-950/20',
  Negociación: 'bg-orange-50/80 dark:bg-orange-950/20',
  Cerrada: 'bg-emerald-50/80 dark:bg-emerald-950/20',
}

type OpportunitiesKanbanViewProps = {
  query: string
  filters: OpportunityFilters
  listScope: OpportunityListScope
  recentIds: string[]
}

export function OpportunitiesKanbanView({
  query,
  filters,
  listScope,
  recentIds,
}: OpportunitiesKanbanViewProps) {
  const navigate = useNavigate()
  const { userOpportunities, isArchived } = useOpportunitiesRegistry()

  const opportunities = useMemo(() => {
    const all = mergeWithDemoDataset(userOpportunities, getOpportunitiesBoardDataset())
    let result = filterOpportunities(all, query, (o) =>
      opportunityRowMatchesFilters(o, filters),
    ).filter(
      (o) =>
        !isArchived(o.id) && opportunityMatchesListScope(o, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortOpportunitiesByRecentlyViewed(result, recentIds)
    }
    return result
  }, [query, filters, userOpportunities, isArchived, listScope, recentIds])

  const byStage = useMemo(() => {
    const map: Record<OpportunityJourneyMainStage, OpportunityListItem[]> = {
      Calificados: [],
      'En diagnóstico': [],
      Propuesta: [],
      Negociación: [],
      Cerrada: [],
    }
    opportunities.forEach((o) => {
      map[opportunityKanbanColumn(o.stage)].push(o)
    })
    return map
  }, [opportunities])

  const columnKeys = useMemo(() => OPPORTUNITY_KANBAN_COLUMNS.map((c) => c.stage), [])
  const { sliceForColumn, loadMoreForColumn, hiddenInColumn } = useKanbanColumnLimits(
    columnKeys,
    [opportunities.length, query, listScope, filters],
  )

  if (opportunities.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <p className="text-sm font-medium text-foreground">No hay oportunidades con los filtros actuales</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={opportunities.length}
        entityLabel="oportunidades"
        viewMode="kanban"
      />
      <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[min(100%,960px)] gap-4 lg:min-w-[960px]">
        {OPPORTUNITY_KANBAN_COLUMNS.map(({ stage, description }) => {
          const cards = byStage[stage]
          const visibleCards = sliceForColumn(stage, cards)
          return (
            <section
              key={stage}
              className={cn(
                'flex w-[min(100%,320px)] shrink-0 flex-col rounded-xl border border-border',
                columnSurface[stage],
              )}
            >
              <header className="border-b border-border/60 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{stage}</h2>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Badge variant="secondary" className="tabular-nums">
                    {cards.length}
                  </Badge>
                </div>
              </header>
              <ul className={cn('flex flex-1 flex-col gap-2 p-3', KANBAN_COLUMN_SCROLL_CLASS)}>
                {cards.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-border/80 bg-card/50 px-3 py-8 text-center text-xs text-muted-foreground">
                    Sin oportunidades
                  </li>
                ) : (
                  visibleCards.map((opp) => (
                    <li key={opp.id}>
                      <article
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/oportunidades/${opp.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            navigate(`/oportunidades/${opp.id}`)
                          }
                        }}
                        className="group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted">
                            <Target aria-hidden className="size-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-foreground">{opp.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {opp.company} · {opp.amount}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 opacity-0 group-hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal aria-hidden className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigate(`/oportunidades/${opp.id}`)}
                              >
                                Ver ficha
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">Archivar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge
                            variant={opportunityStageVariant(opp.stage)}
                            className="text-[10px]"
                          >
                            {opp.stage}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {opp.priority}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {opp.forecast}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">{opp.lastActivity}</p>
                      </article>
                    </li>
                  ))
                )}
                <KanbanColumnMore
                  hiddenCount={hiddenInColumn(stage, cards.length)}
                  onLoadMore={() => loadMoreForColumn(stage)}
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
