import { MoreHorizontal, Wallet } from 'lucide-react'
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
  filterInvoices,
  getInvoicesBoardDataset,
  INVOICE_KANBAN_COLUMNS,
} from '@/data/invoices-views.mock'
import type { InvoiceListItem, InvoiceStatus } from '@/data/invoices.mock'
import { useInvoicesRegistry } from '@/hooks/use-invoices-registry'
import {
  invoiceListStatusLabel,
  invoiceStatusVariant,
  withResolvedInvoiceListStatus,
} from '@/lib/invoice-display'
import { invoiceStageDisplayName } from '@/lib/invoice-journey'
import { invoiceRowMatchesFilters, type InvoiceFilters } from '@/lib/invoice-filters'
import {
  invoiceMatchesListScope,
  sortInvoicesByRecentlyViewed,
  type InvoiceListScope,
} from '@/lib/invoice-list-scope'
import { mergeWithDemoDataset } from '@/lib/demo-dataset'
import { useKanbanColumnLimits } from '@/hooks/use-kanban-column-limits'
import { KANBAN_COLUMN_SCROLL_CLASS } from '@/lib/large-dataset-view'
import { cn } from '@/lib/utils'

const columnSurface: Record<InvoiceStatus, string> = {
  Borrador: 'bg-muted/50 dark:bg-muted/20',
  Pendiente: 'bg-amber-50/80 dark:bg-amber-950/20',
  Vencida: 'bg-red-50/80 dark:bg-red-950/20',
  Pagada: 'bg-emerald-50/80 dark:bg-emerald-950/20',
  Anulada: 'bg-slate-100/80 dark:bg-slate-900/30',
}

type InvoicesKanbanViewProps = {
  query: string
  filters: InvoiceFilters
  listScope: InvoiceListScope
  recentIds: string[]
}

export function InvoicesKanbanView({
  query,
  filters,
  listScope,
  recentIds,
}: InvoicesKanbanViewProps) {
  const navigate = useNavigate()
  const { userInvoices, isArchived } = useInvoicesRegistry()

  const invoices = useMemo(() => {
    const all = mergeWithDemoDataset(userInvoices, getInvoicesBoardDataset())
    let result = filterInvoices(all, query, (inv) =>
      invoiceRowMatchesFilters(inv, filters),
    ).filter(
      (inv) =>
        !isArchived(inv.id) && invoiceMatchesListScope(inv, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortInvoicesByRecentlyViewed(result, recentIds)
    }
    return result.map(withResolvedInvoiceListStatus)
  }, [query, filters, userInvoices, isArchived, listScope, recentIds])

  const byStatus = useMemo(() => {
    const map: Record<InvoiceStatus, InvoiceListItem[]> = {
      Borrador: [],
      Pendiente: [],
      Vencida: [],
      Pagada: [],
      Anulada: [],
    }
    for (const inv of invoices) {
      const bucket = map[inv.status]
      if (bucket) bucket.push(inv)
    }
    return map
  }, [invoices])

  const columnKeys = useMemo(() => INVOICE_KANBAN_COLUMNS.map((c) => c.status), [])
  const { sliceForColumn, loadMoreForColumn, hiddenInColumn } = useKanbanColumnLimits(
    columnKeys,
    [invoices.length, query, listScope, filters],
  )

  if (invoices.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <p className="text-sm font-medium text-foreground">
          No hay facturas con los filtros actuales
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={invoices.length}
        entityLabel="facturas"
        viewMode="kanban"
      />
      <div className="grid gap-4 lg:grid-cols-4">
      {INVOICE_KANBAN_COLUMNS.map(({ status, description }) => {
        const items = byStatus[status]
        const visibleItems = sliceForColumn(status, items)
        return (
          <section
            key={status}
            className={cn(
              'flex min-h-[320px] flex-col rounded-xl border border-border',
              columnSurface[status],
            )}
          >
            <header className="border-b border-border/60 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {invoiceStageDisplayName(status)}
                </h2>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </header>
            <ul className={cn('flex flex-1 flex-col gap-2 p-3', KANBAN_COLUMN_SCROLL_CLASS)}>
              {visibleItems.map((item) => (
                <li key={item.id}>
                  <article
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/facturacion/${item.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(`/facturacion/${item.id}`)
                    }}
                    className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Wallet aria-hidden className="size-4" />
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
                      {item.number}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.client}</p>
                    <p className="mt-2 text-sm font-semibold tabular-nums">{item.amount}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={invoiceStatusVariant(item.status)}>
                        {invoiceListStatusLabel(item)}
                      </Badge>
                      <Badge variant="secondary">{item.paymentMethod}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Vence {item.dueDate}</p>
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
  )
}
