import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { SegmentsListPagination } from '@/components/list/SegmentsListPagination'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { companySegments, countSegmentMatches, filterCompanies } from '@/data/companies-views.mock'
import type { CompanyLifecycleStatus, CompanyListItem } from '@/data/companies.mock'
import { useCompaniesRegistry } from '@/hooks/use-companies-registry'
import {
  companyMatchesListScope,
  sortCompaniesByRecentlyViewed,
  type CompanyListScope,
} from '@/lib/company-list-scope'
import type { CompanyFilters } from '@/lib/company-filters'
import { companyEmployeesSnippet } from '@/lib/company-display'
import { initialsFromLabel } from '@/lib/image-upload'
import { useSegmentsPagination } from '@/hooks/use-segments-pagination'
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

type CompaniesSegmentsViewProps = {
  query: string
  filters: CompanyFilters
  listScope: CompanyListScope
  recentIds: string[]
}

export function CompaniesSegmentsView({
  query,
  filters,
  listScope,
  recentIds,
}: CompaniesSegmentsViewProps) {
  const navigate = useNavigate()
  const { allCompanies, isArchived } = useCompaniesRegistry()
  const [activeSegmentId, setActiveSegmentId] = useState(companySegments[0]!.id)
  const searched = useMemo(() => {
    let result = filterCompanies(allCompanies, query, filters).filter(
      (c) =>
        !isArchived(c.id) && companyMatchesListScope(c, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortCompaniesByRecentlyViewed(result, recentIds)
    }
    return result
  }, [allCompanies, query, filters, isArchived, listScope, recentIds])

  const activeSegment = useMemo(
    () => companySegments.find((s) => s.id === activeSegmentId) ?? companySegments[0]!,
    [activeSegmentId],
  )

  const segmentCompanies = useMemo(
    () => searched.filter(activeSegment.matches),
    [searched, activeSegment],
  )

  const pagination = useSegmentsPagination(segmentCompanies, [
    activeSegmentId,
    query,
    listScope,
    filters,
  ])

  const counts = useMemo(
    () =>
      Object.fromEntries(
        companySegments.map((s) => [s.id, countSegmentMatches(searched, s)]),
      ),
    [searched],
  )

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={searched.length}
        entityLabel="empresas"
        viewMode="segmentos"
      />
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:w-72">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Segmentos guardados
        </p>
        <ul className="space-y-2">
          {companySegments.map((segment) => {
            const count = counts[segment.id] ?? 0
            const isActive = segment.id === activeSegmentId
            return (
              <li key={segment.id}>
                <button
                  type="button"
                  onClick={() => setActiveSegmentId(segment.id)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-start shadow-sm transition-colors',
                    'border-s-4',
                    segment.accentClass,
                    isActive && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{segment.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {segment.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 tabular-nums">
                    {count}
                  </Badge>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      <section className="min-w-0 flex-1 rounded-xl border border-border bg-card shadow-sm">
        <header className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{activeSegment.name}</h2>
            <p className="text-sm text-muted-foreground">{activeSegment.description}</p>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            {pagination.total} empresa{pagination.total === 1 ? '' : 's'}
          </p>
        </header>

        {pagination.total === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center p-10 text-center">
            <p className="text-sm font-medium text-foreground">
              Ningún resultado en este segmento con los filtros actuales
            </p>
          </div>
        ) : (
          <>
            <ul className="max-h-[min(70vh,720px)] divide-y divide-border overflow-y-auto">
              {pagination.visible.map((company) => (
                <SegmentCompanyRow
                  key={company.id}
                  company={company}
                  onOpen={() => navigate(`/empresas/${company.id}`)}
                  lifecycleVariant={lifecycleVariant}
                />
              ))}
            </ul>
            <SegmentsListPagination
              total={pagination.total}
              rangeFrom={pagination.rangeFrom}
              rangeTo={pagination.rangeTo}
              page={pagination.page}
              totalPages={pagination.totalPages}
              canPrev={pagination.canPrev}
              canNext={pagination.canNext}
              onPrev={() => pagination.setPage((p) => p - 1)}
              onNext={() => pagination.setPage((p) => p + 1)}
              entityLabel="empresas"
            />
          </>
        )}
      </section>
    </div>
    </div>
  )
}

function SegmentCompanyRow({
  company,
  onOpen,
  lifecycleVariant: variant,
}: {
  company: CompanyListItem
  onOpen: () => void
  lifecycleVariant: (s: CompanyLifecycleStatus) => 'customer' | 'prospect' | 'lead' | 'supplier'
}) {
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen()
          }
        }}
        className="group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
      >
        <Avatar className="size-10 shrink-0 rounded-lg border border-border">
          <AvatarImage src={company.logoUrl} alt={company.name} />
          <AvatarFallback className="rounded-lg text-xs">
            {initialsFromLabel(company.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground group-hover:text-primary">
            {company.name}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {[
              company.industry,
              company.city,
              companyEmployeesSnippet(company.employees),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={variant(company.lifecycle)}>{company.lifecycle}</Badge>
          <Badge variant={company.operationalStatus === 'Activa' ? 'customer' : 'muted'}>
            {company.operationalStatus}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Ver ficha de ${company.name}`}
            onClick={(e) => {
              e.stopPropagation()
              onOpen()
            }}
          >
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  )
}
