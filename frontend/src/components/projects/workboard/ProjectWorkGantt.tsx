import { FileSpreadsheet, ImageDown } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AssigneeAvatarStack } from '@/components/shared/AssigneeAvatarStack'
import { Button } from '@/components/ui/button'
import {
  downloadGanttExcel,
  downloadGanttPng,
} from '@/lib/project-gantt-export'
import { toast } from '@/lib/toast'
import {
  buildGanttRows,
  buildGanttTimeline,
  countItemsWithPlannedDates,
  ganttTimelineWidthPx,
  rangeToBarStyle,
  todayMarkerPct,
  type GanttRow,
} from '@/lib/project-gantt'
import { useUsersRegistry } from '@/hooks/use-users-registry'
import { usePrefetchUserAvatars } from '@/hooks/use-user-avatar-url'
import type { ProjectWorkPlan } from '@/types/project-work-plan'
import { cn } from '@/lib/utils'

const LABEL_WIDTH = 280
const GROUP_ROW_HEIGHT = 36
const ITEM_ROW_HEIGHT = 44

const accentBarClass: Record<string, string> = {
  'chart-1': 'bg-[var(--chart-1)]/25 border-[var(--chart-1)]/50',
  'chart-2': 'bg-[var(--chart-2)]/25 border-[var(--chart-2)]/50',
  'chart-3': 'bg-[var(--chart-3)]/25 border-[var(--chart-3)]/50',
  'chart-4': 'bg-[var(--chart-4)]/25 border-[var(--chart-4)]/50',
  'chart-5': 'bg-[var(--chart-5)]/25 border-[var(--chart-5)]/50',
}

type ProjectWorkGanttProps = {
  plan: ProjectWorkPlan
  projectTitle?: string
}

function ganttAssigneesLabel(assignees: string[]): string {
  const list = assignees.map((s) => s.trim()).filter(Boolean)
  if (list.length === 0) return 'Sin responsables'
  return list.join(', ')
}

function GanttRowLabel({ row }: { row: GanttRow }) {
  if (row.kind === 'group') {
    return (
      <div
        className={cn(
          'flex items-center border-b border-border/80 px-3 text-xs font-semibold uppercase tracking-wide text-foreground',
          accentBarClass[row.accent],
        )}
        style={{ height: GROUP_ROW_HEIGHT }}
      >
        <span className="truncate">{row.label}</span>
      </div>
    )
  }

  const assignees = row.item.assignees.map((s) => s.trim()).filter(Boolean)
  const assigneeLabel = ganttAssigneesLabel(assignees)
  const title = `${row.item.name}\nResponsables: ${assigneeLabel}`

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b border-border/60 px-2.5 py-1',
        row.depth === 1 && 'bg-muted/15 ps-5',
        row.overdue && !row.done && 'bg-amber-50/80 dark:bg-amber-950/30',
      )}
      style={{ height: ITEM_ROW_HEIGHT }}
      title={title}
    >
      <AssigneeAvatarStack
        assignees={assignees}
        size="sm"
        showEmpty
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <p className="min-w-0 truncate text-xs font-medium text-foreground">{row.item.name}</p>
          {row.done ? (
            <span className="shrink-0 text-[10px] text-emerald-600 dark:text-emerald-400">✓</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function GanttRowBars({
  row,
  timeline,
  widthPx,
}: {
  row: GanttRow
  timeline: NonNullable<ReturnType<typeof buildGanttTimeline>>
  widthPx: number
}) {
  const rowHeight = row.kind === 'group' ? GROUP_ROW_HEIGHT : ITEM_ROW_HEIGHT

  if (row.kind === 'group') {
    return (
      <div
        className={cn('relative border-b border-border/80', accentBarClass[row.accent])}
        style={{ width: widthPx, height: rowHeight }}
      />
    )
  }

  const assignees = ganttAssigneesLabel(row.item.assignees)
  const plannedStyle = row.planned ? rangeToBarStyle(row.planned, timeline) : null
  const actualStyle = row.actual ? rangeToBarStyle(row.actual, timeline) : null
  const barTitle = (kind: string) =>
    `${row.item.name} · ${assignees}\n${kind}`

  return (
    <div
      className={cn(
        'relative border-b border-border/60',
        row.depth === 1 && 'bg-muted/15',
        row.overdue && !row.done && 'bg-amber-50/80 dark:bg-amber-950/30',
      )}
      style={{ width: widthPx, height: rowHeight }}
    >
      {plannedStyle ? (
        <div
          className="absolute top-3 h-3 rounded-sm border border-primary/40 bg-primary/35"
          style={{
            left: `${plannedStyle.leftPct}%`,
            width: `${plannedStyle.widthPct}%`,
          }}
          title={barTitle('Planificado')}
        />
      ) : null}
      {actualStyle ? (
        <div
          className="absolute top-6 h-2.5 rounded-sm border border-emerald-600/50 bg-emerald-500/45"
          style={{
            left: `${actualStyle.leftPct}%`,
            width: `${actualStyle.widthPct}%`,
          }}
          title={barTitle('Ejecutado')}
        />
      ) : null}
    </div>
  )
}

export function ProjectWorkGantt({ plan, projectTitle = 'Proyecto' }: ProjectWorkGanttProps) {
  const [exporting, setExporting] = useState(false)
  const { allUsers } = useUsersRegistry()
  const timeline = useMemo(() => buildGanttTimeline(plan), [plan])
  const rows = useMemo(() => buildGanttRows(plan), [plan])
  const widthPx = timeline ? ganttTimelineWidthPx(timeline) : 0
  const todayPct = timeline ? todayMarkerPct(timeline) : null
  const datedCount = countItemsWithPlannedDates(plan)

  const handleExportExcel = () => {
    const ok = downloadGanttExcel(plan, projectTitle)
    if (ok) toast.success('Gantt exportado a Excel.')
    else toast.warning('No hay fechas planificadas para exportar.')
  }

  const handleExportPng = async () => {
    setExporting(true)
    try {
      const ok = await downloadGanttPng(plan, projectTitle, { users: allUsers })
      if (ok) toast.success('Gantt exportado a PNG.')
      else toast.warning('No hay fechas planificadas para exportar.')
    } catch {
      toast.error('No se pudo generar la imagen del Gantt.')
    } finally {
      setExporting(false)
    }
  }

  const assigneeNames = useMemo(
    () =>
      rows.flatMap((r) =>
        r.kind === 'item' ? r.item.assignees.map((s) => s.trim()).filter(Boolean) : [],
      ),
    [rows],
  )
  usePrefetchUserAvatars(assigneeNames)

  if (!timeline || datedCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
        <p className="text-sm font-medium text-foreground">Sin fechas para el diagrama de Gantt</p>
        <p className="max-w-md text-xs text-muted-foreground">
          En la vista tabla, completa al menos <strong>Inicio</strong> y <strong>Fin</strong> en la
          columna Planificado (o Ejecutado) de cada actividad para ver las barras aquí.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 px-4 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-6 rounded-sm border border-primary/40 bg-primary/35" />
            Planificado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-6 rounded-sm border border-emerald-600/50 bg-emerald-500/45" />
            Ejecutado
          </span>
          {todayPct != null ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-0.5 bg-destructive" />
              Hoy
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={exporting}
            onClick={handleExportExcel}
          >
            <FileSpreadsheet aria-hidden className="size-3.5" />
            Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={exporting}
            onClick={() => void handleExportPng()}
          >
            <ImageDown aria-hidden className="size-3.5" />
            {exporting ? 'Generando…' : 'PNG'}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max">
          <div
            className="sticky left-0 z-20 shrink-0 border-r border-border bg-card"
            style={{ width: LABEL_WIDTH }}
          >
            <div className="flex h-10 flex-col justify-end border-b border-border bg-muted/40 px-3 pb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Actividad
              </span>
              <span className="text-[9px] font-normal normal-case text-muted-foreground/90">
                Responsables
              </span>
            </div>
            {rows.map((row) => (
              <GanttRowLabel key={row.kind === 'group' ? `g-${row.id}` : row.item.id} row={row} />
            ))}
          </div>

          <div className="relative min-w-0">
            <div
              className="relative flex h-10 items-end border-b border-border bg-muted/40"
              style={{ width: widthPx }}
            >
              {timeline.ticks.map((tick) => (
                <div
                  key={tick.date.toISOString()}
                  className="absolute bottom-0 border-l border-border/60 pb-1 ps-1 text-[10px] text-muted-foreground"
                  style={{ left: `${tick.leftPct}%` }}
                >
                  {tick.label}
                </div>
              ))}
            </div>

            <div className="relative" style={{ width: widthPx }}>
              {todayPct != null ? (
                <div
                  className="pointer-events-none absolute inset-y-0 z-10 w-px bg-destructive/70"
                  style={{ left: `${todayPct}%` }}
                  aria-hidden
                />
              ) : null}
              {rows.map((row) => (
                <GanttRowBars
                  key={row.kind === 'group' ? `g-${row.id}` : row.item.id}
                  row={row}
                  timeline={timeline}
                  widthPx={widthPx}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
