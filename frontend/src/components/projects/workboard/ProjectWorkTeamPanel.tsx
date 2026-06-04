import { useMemo } from 'react'

import { UserAssigneeAvatar } from '@/components/shared/UserAssigneeAvatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUsersRegistry } from '@/hooks/use-users-registry'
import { collectWorkPlanAssigneeNames } from '@/lib/project-work-assignees'
import { computeHoursByAssignee } from '@/lib/project-work-hours-by-assignee'
import { formatWorkboardHoursDisplay } from '@/lib/project-work-plan'
import type { ProjectWorkPlan } from '@/types/project-work-plan'

type ProjectWorkTeamPanelProps = {
  plan: ProjectWorkPlan
  managerName?: string
}

export function ProjectWorkTeamPanel({ plan, managerName }: ProjectWorkTeamPanelProps) {
  const { allUsers } = useUsersRegistry()
  const names = useMemo(() => collectWorkPlanAssigneeNames(plan), [plan])
  const hoursByName = useMemo(() => {
    const { rows } = computeHoursByAssignee(plan, { scope: 'project' })
    return new Map(rows.map((r) => [r.name, r]))
  }, [plan])

  const userByName = useMemo(
    () => new Map(allUsers.map((u) => [u.name, u])),
    [allUsers],
  )

  if (names.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Equipo del proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aún no hay responsables en el plan de trabajo. Asigna personas en la columna
            «Responsables» de cada actividad en la pestaña Detalle.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Equipo del proyecto</CardTitle>
        <p className="text-sm text-muted-foreground">
          {names.length} persona{names.length === 1 ? '' : 's'} asignada
          {names.length === 1 ? '' : 's'} en el plan de trabajo
        </p>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {names.map((name) => {
            const user = userByName.get(name)
            const hours = hoursByName.get(name)
            const isManager = Boolean(managerName && name === managerName)

            return (
              <li
                key={name}
                className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <UserAssigneeAvatar name={name} className="size-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{name}</p>
                    {isManager ? (
                      <Badge variant="secondary" className="font-normal">
                        Gerente de proyecto
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {user?.role ?? 'Participante del plan'}
                    {user?.email ? ` · ${user.email}` : ''}
                  </p>
                  {hours ? (
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {hours.activityCount} actividad{hours.activityCount === 1 ? '' : 'es'} ·{' '}
                      {formatWorkboardHoursDisplay(hours.estimatedHours) || '0'}h estimadas ·{' '}
                      {formatWorkboardHoursDisplay(hours.actualHours) || '0'}h reales
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
