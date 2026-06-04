import { Clock, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

import { UserAssigneeAvatar } from '@/components/shared/UserAssigneeAvatar'
import { Input } from '@/components/ui/input'
import {
  computeHoursByAssignee,
  defaultWorkHoursDayKey,
  defaultWorkHoursMonthKey,
  type WorkHoursPeriodScope,
} from '@/lib/project-work-hours-by-assignee'
import { formatWorkboardHoursDisplay } from '@/lib/project-work-plan'
import type { ProjectWorkPlan } from '@/types/project-work-plan'
import { cn } from '@/lib/utils'

const SCOPE_OPTIONS: { value: WorkHoursPeriodScope; label: string }[] = [
  { value: 'project', label: 'Proyecto completo' },
  { value: 'month', label: 'Por mes' },
  { value: 'day', label: 'Por día' },
]

type ProjectWorkHoursByPersonProps = {
  plan: ProjectWorkPlan
}

export function ProjectWorkHoursByPerson({ plan }: ProjectWorkHoursByPersonProps) {
  const [scope, setScope] = useState<WorkHoursPeriodScope>('project')
  const [month, setMonth] = useState(defaultWorkHoursMonthKey)
  const [day, setDay] = useState(defaultWorkHoursDayKey)

  const result = useMemo(
    () =>
      computeHoursByAssignee(plan, {
        scope,
        month: scope === 'month' ? month : undefined,
        day: scope === 'day' ? day : undefined,
      }),
    [plan, scope, month, day],
  )

  const scopeHint =
    scope === 'project'
      ? 'Suma todas las horas de actividades hoja (excluye canceladas). Con varios responsables, se reparten en partes iguales.'
      : scope === 'month'
        ? 'Prorratea las horas según los días planificados de cada actividad que caen en el mes elegido.'
        : 'Prorratea las horas del día elegido según el rango planificado de cada actividad.'

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-sm font-medium text-foreground">Filtro de periodo</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{scopeHint}</p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div
            className="inline-flex w-full shrink-0 rounded-lg border border-border bg-background p-0.5 shadow-sm sm:w-auto"
            role="tablist"
            aria-label="Periodo de horas"
          >
            {SCOPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={scope === opt.value}
                className={cn(
                  'min-h-9 flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors sm:flex-none sm:px-3.5',
                  scope === opt.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
                onClick={() => setScope(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {scope === 'month' ? (
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <label
                htmlFor="work-hours-month"
                className="shrink-0 text-xs font-medium text-muted-foreground"
              >
                Mes
              </label>
              <Input
                id="work-hours-month"
                type="month"
                className="h-9 min-w-0 flex-1 bg-background sm:w-44 sm:flex-none"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
          ) : null}

          {scope === 'day' ? (
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <label
                htmlFor="work-hours-day"
                className="shrink-0 text-xs font-medium text-muted-foreground"
              >
                Día
              </label>
              <Input
                id="work-hours-day"
                type="date"
                className="h-9 min-w-0 flex-1 bg-background sm:w-44 sm:flex-none"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </div>
          ) : null}
        </div>
      </div>

      {result.rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <Users aria-hidden className="size-10 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">Sin horas en este periodo</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Asigna responsables y fechas planificadas en las actividades, o amplía el rango del
            filtro.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Persona</th>
                <th className="px-4 py-3 text-right">Horas estimadas</th>
                <th className="px-4 py-3 text-right">Horas reales</th>
                <th className="px-4 py-3 text-right">Actividades</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.name} className="border-b border-border/80 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <UserAssigneeAvatar name={row.name} className="size-8" />
                      <span className="font-medium text-foreground">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatWorkboardHoursDisplay(row.estimatedHours) || '0'}
                    <span className="ms-0.5 text-xs font-normal text-muted-foreground">h</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {formatWorkboardHoursDisplay(row.actualHours) || '0'}
                    <span className="ms-0.5 text-xs">h</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {row.activityCount}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 font-medium">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <Clock aria-hidden className="size-3.5 text-muted-foreground" />
                    Total
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatWorkboardHoursDisplay(result.totals.estimatedHours) || '0'} h
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {formatWorkboardHoursDisplay(result.totals.actualHours) || '0'} h
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
