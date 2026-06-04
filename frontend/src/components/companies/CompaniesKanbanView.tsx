import { MoreHorizontal } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { KanbanColumnMore } from '@/components/list/KanbanColumnMore'
import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { COMPANY_KANBAN_COLUMNS, filterCompanies } from '@/data/companies-views.mock'
import type {
  CompanyLifecycleStatus,
  CompanyListItem,
} from '@/data/companies.mock'
import { useCompaniesRegistry } from '@/hooks/use-companies-registry'
import {
  companyMatchesListScope,
  sortCompaniesByRecentlyViewed,
  type CompanyListScope,
} from '@/lib/company-list-scope'
import type { CompanyFilters } from '@/lib/company-filters'
import { normalizeCompanyLifecycle } from '@/lib/company-form'
import { companyEmployeesSnippet } from '@/lib/company-display'
import { initialsFromLabel } from '@/lib/image-upload'
import { useKanbanColumnLimits } from '@/hooks/use-kanban-column-limits'
import { KANBAN_COLUMN_SCROLL_CLASS } from '@/lib/large-dataset-view'
import { cn } from '@/lib/utils'

function lifecycleVariant(
  lifecycle: CompanyLifecycleStatus,
): 'customer' | 'prospect' | 'lead' | 'supplier' {
  switch (lifecycle) {
    case 'Cliente':
      return 'customer'
    case 'Prospecto':
      return 'prospect'
    case 'Proveedor':
      return 'supplier'
    default:
      return 'prospect'
  }
}

const columnSurface: Record<CompanyLifecycleStatus, string> = {
  Prospecto: 'bg-sky-50/80 dark:bg-sky-950/20',
  Cliente: 'bg-emerald-50/80 dark:bg-emerald-950/20',
  Proveedor: 'bg-amber-50/80 dark:bg-amber-950/20',
}

type CompaniesKanbanViewProps = {
  query: string
  filters: CompanyFilters
  listScope: CompanyListScope
  recentIds: string[]
  onEditCompany?: (company: CompanyListItem) => void
  onArchiveCompany?: (company: CompanyListItem) => void
}

export function CompaniesKanbanView({
  query,
  filters,
  listScope,
  recentIds,
  onEditCompany,
  onArchiveCompany,
}: CompaniesKanbanViewProps) {
  const navigate = useNavigate()
  const { allCompanies, isArchived } = useCompaniesRegistry()

  const companies = useMemo(() => {
    let result = filterCompanies(allCompanies, query, filters).filter(
      (c) =>
        !isArchived(c.id) && companyMatchesListScope(c, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortCompaniesByRecentlyViewed(result, recentIds)
    }
    return result
  }, [allCompanies, query, filters, isArchived, listScope, recentIds])

  const byLifecycle = useMemo(() => {
    const map: Record<CompanyLifecycleStatus, CompanyListItem[]> = {
      Prospecto: [],
      Cliente: [],
      Proveedor: [],
    }
    companies.forEach((c) => {
      const lifecycle = normalizeCompanyLifecycle(c.lifecycle)
      map[lifecycle].push({ ...c, lifecycle })
    })
    return map
  }, [companies])

  const columnKeys = useMemo(
    () => COMPANY_KANBAN_COLUMNS.map((c) => c.lifecycle),
    [],
  )
  const { sliceForColumn, loadMoreForColumn, hiddenInColumn } = useKanbanColumnLimits(
    columnKeys,
    [companies.length, query, listScope, filters],
  )

  if (companies.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <p className="text-sm font-medium text-foreground">
          No hay empresas con los filtros actuales
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Prueba otro término de búsqueda o limpia los filtros.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={companies.length}
        entityLabel="empresas"
        viewMode="kanban"
      />
      <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[min(100%,960px)] gap-4 lg:min-w-[960px]">
        {COMPANY_KANBAN_COLUMNS.map(({ lifecycle, description }) => {
          const cards = byLifecycle[lifecycle]
          const visibleCards = sliceForColumn(lifecycle, cards)
          return (
            <section
              key={lifecycle}
              className={cn(
                'flex w-[min(100%,320px)] shrink-0 flex-col rounded-xl border border-border',
                columnSurface[lifecycle],
              )}
            >
              <header className="border-b border-border/60 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{lifecycle}</h2>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Badge variant={lifecycleVariant(lifecycle)} className="tabular-nums">
                    {cards.length}
                  </Badge>
                </div>
              </header>
              <ul className={cn('flex flex-1 flex-col gap-2 p-3', KANBAN_COLUMN_SCROLL_CLASS)}>
                {cards.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-border/80 bg-card/50 px-3 py-8 text-center text-xs text-muted-foreground">
                    Sin empresas en esta columna
                  </li>
                ) : (
                  visibleCards.map((company) => (
                    <li key={company.id}>
                      <article
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/empresas/${company.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            navigate(`/empresas/${company.id}`)
                          }
                        }}
                        className="group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="size-9 shrink-0 rounded-lg border border-border">
                            <AvatarImage src={company.logoUrl} alt={company.name} />
                            <AvatarFallback className="rounded-lg text-xs">
                              {initialsFromLabel(company.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-foreground">
                              {company.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {[
                                company.industry,
                                company.city,
                                companyEmployeesSnippet(company.employees),
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 opacity-0 group-hover:opacity-100"
                                aria-label="Más acciones"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal aria-hidden className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onEditCompany ? (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onEditCompany(company)
                                  }}
                                >
                                  Editar
                                </DropdownMenuItem>
                              ) : null}
                              {onEditCompany && onArchiveCompany ? (
                                <DropdownMenuSeparator />
                              ) : null}
                              {onArchiveCompany ? (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onArchiveCompany(company)
                                  }}
                                >
                                  Archivar
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge
                            variant={
                              company.operationalStatus === 'Activa' ? 'customer' : 'muted'
                            }
                            className="text-[10px]"
                          >
                            {company.operationalStatus}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {company.lastActivity}
                        </p>
                      </article>
                    </li>
                  ))
                )}
                <KanbanColumnMore
                  hiddenCount={hiddenInColumn(lifecycle, cards.length)}
                  onLoadMore={() => loadMoreForColumn(lifecycle)}
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
