import { ClipboardList, MoreHorizontal } from 'lucide-react'
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
  filterSolicitudes,
  getSolicitudesBoardDataset,
  SOLICITUD_KANBAN_COLUMNS,
  solicitudKanbanColumn,
  type SolicitudKanbanColumnId,
} from '@/data/solicitudes-views.mock'
import type { SolicitudListItem } from '@/data/solicitudes.mock'
import { useSolicitudesRegistry } from '@/hooks/use-solicitudes-registry'
import { mergeWithDemoDataset } from '@/lib/demo-dataset'
import { useKanbanColumnLimits } from '@/hooks/use-kanban-column-limits'
import { KANBAN_COLUMN_SCROLL_CLASS } from '@/lib/large-dataset-view'
import {
  solicitudMatchesListScope,
  sortSolicitudesByRecentlyViewed,
  type SolicitudListScope,
} from '@/lib/solicitud-list-scope'
import { solicitudRowMatchesFilters, type SolicitudFilters } from '@/lib/solicitud-filters'
import {
  solicitudPriorityVariant,
  solicitudStatusVariant,
} from '@/lib/solicitud-display'
import { cn } from '@/lib/utils'

const columnSurface: Record<SolicitudKanbanColumnId, string> = {
  activos: 'bg-sky-50/80 dark:bg-sky-950/20',
  detenidos: 'bg-amber-50/80 dark:bg-amber-950/20',
  cierre: 'bg-emerald-50/80 dark:bg-emerald-950/20',
}

type SolicitudesKanbanViewProps = {
  query: string
  listScope: SolicitudListScope
  recentIds: string[]
  filters: SolicitudFilters
}

export function SolicitudesKanbanView({
  query,
  listScope,
  recentIds,
  filters,
}: SolicitudesKanbanViewProps) {
  const navigate = useNavigate()
  const { userSolicitudes, isArchived } = useSolicitudesRegistry()

  const solicitudes = useMemo(() => {
    const all = mergeWithDemoDataset(userSolicitudes, getSolicitudesBoardDataset())
    let result = filterSolicitudes(all, query).filter(
      (item) =>
        solicitudRowMatchesFilters(item, filters) &&
        !isArchived(item.id) &&
        solicitudMatchesListScope(item, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortSolicitudesByRecentlyViewed(result, recentIds)
    }
    return result
  }, [query, userSolicitudes, isArchived, listScope, recentIds, filters])

  const byColumn = useMemo(() => {
    const map: Record<SolicitudKanbanColumnId, SolicitudListItem[]> = {
      activos: [],
      detenidos: [],
      cierre: [],
    }
    solicitudes.forEach((item) => {
      map[solicitudKanbanColumn(item.status)].push(item)
    })
    return map
  }, [solicitudes])

  const columnKeys = useMemo(
    () => SOLICITUD_KANBAN_COLUMNS.map((column) => column.id),
    [],
  )
  const { sliceForColumn, loadMoreForColumn, hiddenInColumn } = useKanbanColumnLimits(
    columnKeys,
    [solicitudes.length, query, listScope],
  )

  if (solicitudes.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <p className="text-sm font-medium text-foreground">
          No hay solicitudes con los filtros actuales
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={solicitudes.length}
        entityLabel="solicitudes"
        viewMode="kanban"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {SOLICITUD_KANBAN_COLUMNS.map(({ id, title, description }) => {
          const items = byColumn[id]
          const visibleItems = sliceForColumn(id, items)
          return (
            <section
              key={id}
              className={cn(
                'flex min-h-[320px] flex-col rounded-xl border border-border',
                columnSurface[id],
              )}
            >
              <header className="border-b border-border/60 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-foreground">{title}</h2>
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
                      onClick={() => navigate(`/solicitudes/${item.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') navigate(`/solicitudes/${item.id}`)
                      }}
                      className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <ClipboardList aria-hidden className="size-4" />
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MoreHorizontal aria-hidden className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/solicitudes/${item.id}`)}
                            >
                              Ver detalle
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-snug text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.code}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Responsable: {item.assignee || '—'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge variant={solicitudStatusVariant(item.status)}>
                          {item.status}
                        </Badge>
                        <Badge variant={solicitudPriorityVariant(item.priority)}>
                          {item.priority}
                        </Badge>
                      </div>
                    </article>
                  </li>
                ))}
                <KanbanColumnMore
                  hiddenCount={hiddenInColumn(id, items.length)}
                  onLoadMore={() => loadMoreForColumn(id)}
                />
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
