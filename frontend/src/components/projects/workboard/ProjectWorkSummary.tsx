import { AlertTriangle, Clock } from 'lucide-react'

import type { ProjectWorkMetrics } from '@/types/project-work-plan'
import { cn } from '@/lib/utils'

type ProjectWorkSummaryProps = {
  metrics: ProjectWorkMetrics
}

export function ProjectWorkSummary({ metrics }: ProjectWorkSummaryProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-xs font-medium text-muted-foreground">Avance por estado</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
          {metrics.statusProgressPct}%
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {metrics.itemsDone} completadas de {metrics.itemsTotal} activas
          {metrics.itemsCancelled > 0
            ? ` · ${metrics.itemsCancelled} cancelada(s)`
            : ''}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${metrics.statusProgressPct}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-xs font-medium text-muted-foreground">Horas (referencia)</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
          {metrics.hoursUtilizationPct}%
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {metrics.actualHours}h reales / {metrics.estimatedHours}h estimadas
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground/80">
          No define el avance; solo compara esfuerzo registrado vs. planificado.
        </p>
      </div>

      <div
        className={cn(
          'rounded-xl border p-4 shadow-sm',
          metrics.onTrack
            ? 'border-border bg-card'
            : 'border-amber-300/80 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/60',
        )}
      >
        <p
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium',
            metrics.onTrack ? 'text-muted-foreground' : 'text-amber-900 dark:text-amber-200',
          )}
        >
          <Clock aria-hidden className="size-3.5 shrink-0" />
          Retraso en cronograma
        </p>
        <p
          className={cn(
            'mt-1 text-2xl font-bold tabular-nums',
            metrics.onTrack ? 'text-foreground' : 'text-amber-950 dark:text-amber-50',
          )}
        >
          {metrics.scheduleDelayDays > 0 ? `${metrics.scheduleDelayDays} días` : 'Al día'}
        </p>
        <p
          className={cn(
            'mt-1 text-xs',
            metrics.onTrack ? 'text-muted-foreground' : 'text-amber-900 dark:text-amber-300',
          )}
        >
          {metrics.itemsOverdue > 0
            ? `${metrics.itemsOverdue} actividad(es) vencida(s)`
            : 'Sin actividades vencidas'}
        </p>
      </div>

      <div
        className={cn(
          'rounded-xl border p-4 shadow-sm',
          metrics.onTrack
            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
            : 'border-destructive/30 bg-destructive/5',
        )}
      >
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <AlertTriangle aria-hidden className="size-3.5" />
          Estado general
        </p>
        <p
          className={cn(
            'mt-1 text-lg font-semibold',
            metrics.onTrack ? 'text-emerald-800 dark:text-emerald-300' : 'text-destructive',
          )}
        >
          {metrics.onTrack ? 'En plazo' : 'Con retraso'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Basado en fechas fin estimadas vs. hoy (excluye completadas y canceladas)
        </p>
      </div>
    </div>
  )
}
