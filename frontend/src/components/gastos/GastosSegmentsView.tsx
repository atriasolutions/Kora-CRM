import { ChevronRight, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { SegmentsListPagination } from '@/components/list/SegmentsListPagination'
import { Badge } from '@/components/ui/badge'
import { useExpensesRegistry } from '@/hooks/use-expenses-registry'
import { mergeWithDemoDataset } from '@/lib/demo-dataset'
import { expenseStatusVariant } from '@/lib/expense-display'
import {
  countExpenseSegmentMatches,
  expenseRowMatchesFilters,
  expenseSegments,
  filterExpenses,
  type ExpenseFilters,
} from '@/lib/expense-filters'
import {
  expenseMatchesListScope,
  sortExpensesByRecentlyViewed,
  type ExpenseListScope,
} from '@/lib/expense-list-scope'
import { useSegmentsPagination } from '@/hooks/use-segments-pagination'
import { cn } from '@/lib/utils'
import { expenseListSeed } from '@/data/expenses.mock'

type GastosSegmentsViewProps = {
  query: string
  filters: ExpenseFilters
  listScope: ExpenseListScope
  recentIds: string[]
}

export function GastosSegmentsView({
  query,
  filters,
  listScope,
  recentIds,
}: GastosSegmentsViewProps) {
  const navigate = useNavigate()
  const { userExpenses, isArchived } = useExpensesRegistry()
  const [activeSegmentId, setActiveSegmentId] = useState(expenseSegments[0]!.id)

  const allExpenses = useMemo(
    () => mergeWithDemoDataset(userExpenses, expenseListSeed),
    [userExpenses],
  )
  const searched = useMemo(() => {
    let result = filterExpenses(allExpenses, query, (row) =>
      expenseRowMatchesFilters(row, filters),
    ).filter(
      (row) =>
        !isArchived(row.id) && expenseMatchesListScope(row, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortExpensesByRecentlyViewed(result, recentIds)
    }
    return result
  }, [allExpenses, query, filters, isArchived, listScope, recentIds])

  const activeSegment = useMemo(
    () => expenseSegments.find((s) => s.id === activeSegmentId) ?? expenseSegments[0]!,
    [activeSegmentId],
  )

  const segmentItems = useMemo(
    () => searched.filter(activeSegment.matches),
    [searched, activeSegment],
  )

  const pagination = useSegmentsPagination(segmentItems, [
    activeSegmentId,
    query,
    listScope,
    filters,
  ])

  const counts = useMemo(
    () =>
      Object.fromEntries(
        expenseSegments.map((s) => [s.id, countExpenseSegmentMatches(searched, s)]),
      ),
    [searched],
  )

  return (
    <div className="space-y-3">
      <LargeDatasetBanner total={searched.length} entityLabel="gastos" viewMode="segmentos" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-72">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Segmentos
          </p>
          <ul className="space-y-1">
            {expenseSegments.map((segment) => {
              const active = segment.id === activeSegmentId
              return (
                <li key={segment.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSegmentId(segment.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border-s-4 px-3 py-2.5 text-left transition-colors',
                      segment.accentClass,
                      active ? 'bg-muted' : 'border-transparent hover:bg-muted/50',
                    )}
                  >
                    <span>
                      <span className="block text-sm font-medium">{segment.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {segment.description}
                      </span>
                    </span>
                    <Badge variant="secondary">{counts[segment.id] ?? 0}</Badge>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{activeSegment.name}</h2>
            <span className="text-xs text-muted-foreground">
              {segmentItems.length} resultado{segmentItems.length === 1 ? '' : 's'}
            </span>
          </div>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {pagination.visible.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  onClick={() => navigate(`/gastos/${row.id}`)}
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted/30">
                    <Wallet aria-hidden className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.number}</p>
                    <p className="truncate text-sm text-muted-foreground">{row.concept}</p>
                  </div>
                  <div className="hidden shrink-0 text-end sm:block">
                    <p className="font-medium tabular-nums">{row.amount}</p>
                    <p className="text-xs text-muted-foreground">{row.expenseDate}</p>
                  </div>
                  <Badge variant={expenseStatusVariant(row.status)}>{row.status}</Badge>
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
            {pagination.visible.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                No hay gastos en este segmento.
              </li>
            ) : null}
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
            entityLabel="gastos"
          />
        </div>
      </div>
    </div>
  )
}
