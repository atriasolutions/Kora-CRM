import { ChevronRight, Plus, Puzzle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'
import { RelatedEntityList } from '@/components/shared/RelatedEntityList'
import { isApiEnabled } from '@/api/config'
import { listProjectsForSolicitudApi } from '@/api/projects'
import type { SolicitudDetail } from '@/data/solicitudes.mock'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useProjectsRegistry } from '@/hooks/use-projects-registry'
import type { CreateProjectFormValues } from '@/lib/project-create'
import {
  projectHealthVariant,
  projectStatusVariant,
} from '@/lib/project-display'
import {
  projectsForSolicitudFromList,
  type OpportunityProjectSummary,
} from '@/lib/project-relations'
import { createProjectInitialFromSolicitud } from '@/lib/solicitud-projects'

type SolicitudProjectsPanelProps = {
  solicitud: SolicitudDetail
  canViewProjects: boolean
  canCreateProject: boolean
  onCountChange?: (count: number) => void
}

export function SolicitudProjectsPanel({
  solicitud,
  canViewProjects,
  canCreateProject,
  onCountChange,
}: SolicitudProjectsPanelProps) {
  const navigate = useNavigate()
  const { allProjects, addProject } = useProjectsRegistry()
  const [createOpen, setCreateOpen] = useState(false)
  const [apiProjects, setApiProjects] = useState<OpportunityProjectSummary[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!canViewProjects) {
      setApiProjects([])
      return
    }
    if (!isApiEnabled()) {
      setApiProjects(null)
      return
    }
    let cancelled = false
    setLoading(true)
    void listProjectsForSolicitudApi(solicitud.id)
      .then((items) => {
        if (cancelled) return
        setApiProjects(
          items.map(({ id, name, client, status, progress, deadline, health }) => ({
            id,
            name,
            client,
            status,
            progress,
            deadline,
            health,
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setApiProjects([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [canViewProjects, solicitud.id])

  const related = useMemo(() => {
    if (!canViewProjects) return []
    if (isApiEnabled()) return apiProjects ?? []
    return projectsForSolicitudFromList(solicitud.id, allProjects)
  }, [allProjects, apiProjects, canViewProjects, solicitud.id])

  const createInitial = useMemo(
    () => createProjectInitialFromSolicitud(solicitud),
    [solicitud],
  )

  useEffect(() => {
    onCountChange?.(related.length)
  }, [onCountChange, related.length])

  const handleCreate = async (values: CreateProjectFormValues) => {
    const item = await addProject(values)
    if (isApiEnabled()) {
      setApiProjects((prev) => {
        const next = prev ?? []
        if (next.some((p) => p.id === item.id)) return next
        return [
          {
            id: item.id,
            name: item.name,
            client: item.client,
            status: item.status,
            progress: item.progress,
            deadline: item.deadline,
            health: item.health,
          },
          ...next,
        ]
      })
    }
    navigate(`/proyectos/${item.id}`)
  }

  if (!canViewProjects) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Puzzle aria-hidden className="size-4 text-primary" />
            Proyectos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No tienes permiso para ver proyectos. Solicita acceso al módulo Proyectos para
            consultar entregas vinculadas a esta solicitud.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Puzzle aria-hidden className="size-4 text-primary" />
            Proyectos vinculados
          </CardTitle>
          {canCreateProject ? (
            <Button
              type="button"
              size="sm"
              className="shadow-sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus aria-hidden className="size-4" />
              Nuevo proyecto
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Cargando proyectos…
            </p>
          ) : related.length === 0 ? (
            <div className="py-8 text-center">
              <Puzzle
                aria-hidden
                className="mx-auto mb-3 size-10 text-muted-foreground"
              />
              <p className="text-sm font-medium text-foreground">
                Sin proyectos vinculados
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Crea un proyecto de entrega asociado a {solicitud.code} · {solicitud.title}.
              </p>
              {canCreateProject ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 border-border"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus aria-hidden className="size-4" />
                  Crear proyecto
                </Button>
              ) : null}
            </div>
          ) : (
            <RelatedEntityList
              items={related}
              searchPlaceholder="Buscar proyectos…"
              searchFilter={(project, q) =>
                project.name.toLowerCase().includes(q) ||
                project.client.toLowerCase().includes(q) ||
                project.status.toLowerCase().includes(q) ||
                project.deadline.toLowerCase().includes(q)
              }
              renderItem={(project) => (
                <li key={project.id}>
                  <Link
                    to={`/proyectos/${project.id}`}
                    className="group flex flex-col gap-3 rounded-lg border border-border px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted/60">
                        <Puzzle aria-hidden className="size-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground group-hover:text-primary">
                          {project.name}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{project.client}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Entrega · {project.deadline}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:shrink-0">
                      <Badge variant={projectStatusVariant(project.status)}>
                        {project.status}
                      </Badge>
                      <Badge variant={projectHealthVariant(project.health)}>
                        {project.health}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {project.progress}
                      </span>
                      <ChevronRight
                        aria-hidden
                        className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </div>
                  </Link>
                </li>
              )}
            />
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Solicitud: {solicitud.code} · {solicitud.title}. Una solicitud puede tener uno o más
            proyectos de implementación.
          </p>
        </CardContent>
      </Card>

      {canCreateProject ? (
        <CreateProjectDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Nuevo proyecto"
          description={`Se vinculará a la solicitud ${solicitud.code} · ${solicitud.title}.`}
          initialValues={createInitial}
          lockSolicitud
          onSubmit={handleCreate}
        />
      ) : null}
    </>
  )
}
