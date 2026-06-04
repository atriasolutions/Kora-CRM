import { MoreHorizontal, Puzzle } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { KanbanColumnMore } from '@/components/list/KanbanColumnMore'
import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { ProjectProgressBar } from '@/components/projects/ProjectProgressBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  filterProjects,
  getProjectsBoardDataset,
  PROJECT_KANBAN_COLUMNS,
} from '@/data/projects-views.mock'
import type { ProjectListItem, ProjectStatus } from '@/data/projects.mock'
import { useProjectsRegistry } from '@/hooks/use-projects-registry'
import { projectHealthVariant, projectPriorityVariant } from '@/lib/project-display'
import { journeyStageVariant } from '@/lib/project-journey'
import { projectRowMatchesFilters, type ProjectFilters } from '@/lib/project-filters'
import {
  projectMatchesListScope,
  sortProjectsByRecentlyViewed,
  type ProjectListScope,
} from '@/lib/project-list-scope'
import { mergeWithDemoDataset } from '@/lib/demo-dataset'
import { useKanbanColumnLimits } from '@/hooks/use-kanban-column-limits'
import { KANBAN_COLUMN_SCROLL_CLASS } from '@/lib/large-dataset-view'
import { cn } from '@/lib/utils'

const columnSurface: Record<ProjectStatus, string> = {
  'En curso': 'bg-sky-50/80 dark:bg-sky-950/20',
  Pausado: 'bg-amber-50/80 dark:bg-amber-950/20',
  Completado: 'bg-emerald-50/80 dark:bg-emerald-950/20',
}

type ProjectsKanbanViewProps = {
  query: string
  filters: ProjectFilters
  listScope: ProjectListScope
  recentIds: string[]
}

export function ProjectsKanbanView({
  query,
  filters,
  listScope,
  recentIds,
}: ProjectsKanbanViewProps) {
  const navigate = useNavigate()
  const { userProjects, isArchived } = useProjectsRegistry()

  const projects = useMemo(() => {
    const all = mergeWithDemoDataset(userProjects, getProjectsBoardDataset())
    let result = filterProjects(all, query, (p) =>
      projectRowMatchesFilters(p, filters),
    ).filter(
      (p) =>
        !isArchived(p.id) && projectMatchesListScope(p, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortProjectsByRecentlyViewed(result, recentIds)
    }
    return result
  }, [query, filters, userProjects, isArchived, listScope, recentIds])

  const byStatus = useMemo(() => {
    const map: Record<ProjectStatus, ProjectListItem[]> = {
      'En curso': [],
      Pausado: [],
      Completado: [],
    }
    projects.forEach((p) => map[p.status].push(p))
    return map
  }, [projects])

  const columnKeys = useMemo(() => PROJECT_KANBAN_COLUMNS.map((c) => c.status), [])
  const { sliceForColumn, loadMoreForColumn, hiddenInColumn } = useKanbanColumnLimits(
    columnKeys,
    [projects.length, query, listScope, filters],
  )

  if (projects.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <p className="text-sm font-medium text-foreground">
          No hay proyectos con los filtros actuales
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={projects.length}
        entityLabel="proyectos"
        viewMode="kanban"
      />
      <div className="grid gap-4 lg:grid-cols-3">
      {PROJECT_KANBAN_COLUMNS.map(({ status, title, description }) => {
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
                    onClick={() => navigate(`/proyectos/${item.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(`/proyectos/${item.id}`)
                    }}
                    className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Puzzle aria-hidden className="size-4" />
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
                    <p className="mt-2 text-sm font-semibold leading-snug text-foreground">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.client}</p>
                    <div className="mt-2">
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-muted-foreground">Avance</span>
                        <span className="font-semibold tabular-nums">{item.progress}</span>
                      </div>
                      <ProjectProgressBar progressNum={item.progressNum} size="sm" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={journeyStageVariant(item.journeyStage)}>
                        {item.journeyStage}
                      </Badge>
                      <Badge variant={projectHealthVariant(item.health)}>{item.health}</Badge>
                      <Badge variant={projectPriorityVariant(item.priority)}>
                        {item.priority}
                      </Badge>
                    </div>
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
