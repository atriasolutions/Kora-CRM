import { Puzzle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { OpportunityProjectSummary } from '@/lib/project-relations'
import { projectHealthVariant, projectStatusVariant } from '@/lib/project-display'

type OpportunityProjectsPanelProps = {
  projects: OpportunityProjectSummary[]
  opportunityName: string
}

export function OpportunityProjectsPanel({
  projects,
  opportunityName,
}: OpportunityProjectsPanelProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Puzzle aria-hidden className="size-4 text-primary" />
          Proyectos de entrega
        </CardTitle>
        <Button variant="outline" size="sm" className="border-border" asChild>
          <Link to="/proyectos">Ver módulo proyectos</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aún no hay proyectos vinculados a esta oportunidad. Al ganar el negocio, crea el
            proyecto desde Proyectos y selecciona esta oportunidad.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/proyectos/${p.id}`}
                  className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.client}</p>
                    <p className="text-xs text-muted-foreground">Entrega {p.deadline}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={projectStatusVariant(p.status)}>{p.status}</Badge>
                    <Badge variant={projectHealthVariant(p.health)}>{p.health}</Badge>
                    <span className="text-sm font-semibold tabular-nums">{p.progress}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Oportunidad: {opportunityName}. Un negocio ganado puede tener uno o más proyectos de
          implementación.
        </p>
      </CardContent>
    </Card>
  )
}
