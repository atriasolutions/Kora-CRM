import { ChevronRight, Puzzle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { LargeDatasetBanner } from '@/components/list/LargeDatasetBanner'
import { SegmentsListPagination } from '@/components/list/SegmentsListPagination'
import { ProjectProgressBar } from '@/components/projects/ProjectProgressBar'
import { Badge } from '@/components/ui/badge'
import {
  countSegmentMatches,
  filterProjects,
  getProjectsBoardDataset,
  projectSegments,
} from '@/data/projects-views.mock'
import { useProjectsRegistry } from '@/hooks/use-projects-registry'
import { mergeWithDemoDataset } from '@/lib/demo-dataset'
import { projectHealthVariant, projectStatusVariant } from '@/lib/project-display'
import { projectRowMatchesFilters, type ProjectFilters } from '@/lib/project-filters'
import {
  projectMatchesListScope,
  sortProjectsByRecentlyViewed,
  type ProjectListScope,
} from '@/lib/project-list-scope'
import { useSegmentsPagination } from '@/hooks/use-segments-pagination'
import { cn } from '@/lib/utils'

type ProjectsSegmentsViewProps = {
  query: string
  filters: ProjectFilters
  listScope: ProjectListScope
  recentIds: string[]
}

export function ProjectsSegmentsView({
  query,
  filters,
  listScope,
  recentIds,
}: ProjectsSegmentsViewProps) {
  const navigate = useNavigate()
  const { userProjects, isArchived } = useProjectsRegistry()
  const [activeSegmentId, setActiveSegmentId] = useState(projectSegments[0]!.id)

  const allProjects = useMemo(
    () => mergeWithDemoDataset(userProjects, getProjectsBoardDataset()),
    [userProjects],
  )
  const searched = useMemo(() => {
    let result = filterProjects(allProjects, query, (p) =>
      projectRowMatchesFilters(p, filters),
    ).filter(
      (p) =>
        !isArchived(p.id) && projectMatchesListScope(p, listScope, recentIds),
    )
    if (listScope === 'recent') {
      result = sortProjectsByRecentlyViewed(result, recentIds)
    }
    return result
  }, [allProjects, query, filters, isArchived, listScope, recentIds])

  const activeSegment = useMemo(
    () => projectSegments.find((s) => s.id === activeSegmentId) ?? projectSegments[0]!,
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
        projectSegments.map((s) => [s.id, countSegmentMatches(searched, s)]),
      ),
    [searched],
  )

  return (
    <div className="space-y-3">
      <LargeDatasetBanner
        total={searched.length}
        entityLabel="proyectos"
        viewMode="segmentos"
      />
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:w-72">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Segmentos
        </p>
        <ul className="space-y-2">
          {projectSegments.map((segment) => {
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
                  <Badge variant="secondary">{count}</Badge>
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
            {pagination.total} proyecto{pagination.total === 1 ? '' : 's'}
          </p>
        </header>
        {pagination.total === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground">
            Ningún proyecto en este segmento.
          </div>
        ) : (
          <>
            <ul className="max-h-[min(70vh,720px)] divide-y divide-border overflow-y-auto">
              {pagination.visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/proyectos/${item.id}`)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-start transition-colors hover:bg-muted/40"
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Puzzle aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">{item.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {item.client} · {item.deadline}
                    </span>
                    <ProjectProgressBar
                      progressNum={item.progressNum}
                      size="sm"
                      className="mt-2 max-w-xs"
                    />
                  </span>
                  <span className="hidden shrink-0 flex-wrap justify-end gap-2 sm:flex">
                    <Badge variant={projectStatusVariant(item.status)}>{item.status}</Badge>
                    <Badge variant={projectHealthVariant(item.health)}>{item.health}</Badge>
                  </span>
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
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
              entityLabel="proyectos"
            />
          </>
        )}
      </section>
    </div>
    </div>
  )
}
