import { ArrowLeft, ArrowRight, Check, ChevronRight, Clock, Pause, Zap } from 'lucide-react'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ActivityStatus } from '@/data/activities.mock'
import type { ActivityJourneyHistoryEntry } from '@/lib/activity-journey'
import {
  ACTIVITY_JOURNEY_MAIN_LINE,
  ACTIVITY_JOURNEY_OFF_ROUTE,
  ACTIVITY_OFF_ROUTE_ENTRY_MAIN_STAGES,
  getAllowedTransitions,
  getMainLineTransitions,
  getOffRouteTransitions,
  getPreviousMainStage,
  getResumeMainStage,
  inferPausedFromMainStage,
  isMainLineStage,
  isOffRouteStage,
  type ActivityJourneyStage,
} from '@/lib/activity-journey'
import { cn } from '@/lib/utils'

type ActivitySuccessPathProps = {
  currentStage: ActivityStatus
  history?: ActivityJourneyHistoryEntry[]
  readOnly?: boolean
  onStageChange?: (stage: ActivityStatus) => void
  className?: string
}

type MainStepState = 'done' | 'current' | 'upcoming' | 'paused-here'

export function ActivitySuccessPath({
  currentStage,
  history = [],
  readOnly = false,
  onStageChange,
  className,
}: ActivitySuccessPathProps) {
  const stage = currentStage as ActivityJourneyStage

  const historyByStage = useMemo(
    () => new Map(history.map((h) => [h.stage, h])),
    [history],
  )

  const onOffRoute = isOffRouteStage(stage)
  const pausedFrom = inferPausedFromMainStage(stage, history)
  const pausedFromIndex = ACTIVITY_JOURNEY_MAIN_LINE.indexOf(pausedFrom)
  const mainIndex = ACTIVITY_JOURNEY_MAIN_LINE.indexOf(
    stage as (typeof ACTIVITY_JOURNEY_MAIN_LINE)[number],
  )

  const progressIndex = onOffRoute
    ? pausedFromIndex
    : mainIndex >= 0
      ? mainIndex
      : 0

  const progressPct =
    ACTIVITY_JOURNEY_MAIN_LINE.length > 1
      ? (progressIndex / (ACTIVITY_JOURNEY_MAIN_LINE.length - 1)) * 100
      : 0

  const transitionCtx = useMemo(() => ({ history }), [history])
  const resumeStage = onOffRoute ? getResumeMainStage(stage, history) : null
  const mainTransitions = getMainLineTransitions(stage, transitionCtx)
  const offRouteTransitions = getOffRouteTransitions(stage)
  const allTransitions = getAllowedTransitions(stage, transitionCtx)
  const previousMain = isMainLineStage(stage) ? getPreviousMainStage(stage) : null
  const canGoBack =
    previousMain !== null && mainTransitions.includes(previousMain)

  const mainStepState = (
    mainStage: (typeof ACTIVITY_JOURNEY_MAIN_LINE)[number],
    index: number,
  ): MainStepState => {
    if (onOffRoute && mainStage === pausedFrom) return 'paused-here'
    if (!onOffRoute && stage === mainStage) return 'current'
    if (index < progressIndex) return 'done'
    return 'upcoming'
  }

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-sm',
        className,
      )}
      aria-label="Ruta del éxito de la actividad"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Zap aria-hidden className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Ruta del éxito</h3>
            <p className="text-xs text-muted-foreground">
              {onOffRoute ? (
                <>
                  Fuera de plazo · retoma en:{' '}
                  <span className="font-medium text-foreground">{pausedFrom}</span>
                </>
              ) : (
                <>
                  Estado actual:{' '}
                  <span className="font-medium text-foreground">{currentStage}</span>
                </>
              )}
            </p>
          </div>
        </div>
        {!readOnly && onStageChange ? (
          <div className="flex flex-wrap items-center gap-2">
            {canGoBack && previousMain ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => onStageChange(previousMain)}
              >
                <ArrowLeft aria-hidden className="size-3.5" />
                Retroceder
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 text-xs">
                  Cambiar estado
                  <ChevronRight aria-hidden className="ms-1 size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Desde «{currentStage}»</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allTransitions.length > 0 ? (
                  allTransitions.map((s) => (
                    <DropdownMenuItem key={s} onSelect={() => onStageChange(s)}>
                      {s}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>Sin transiciones disponibles</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="relative mx-auto max-w-2xl">
          <p className="mb-3 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Flujo principal
          </p>
          <div
            className="absolute left-[6%] right-[6%] top-[1.15rem] h-0.5 rounded-full bg-border"
            aria-hidden
          />
          <div
            className="absolute left-[6%] top-[1.15rem] h-0.5 rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${progressPct * 0.88}%` }}
            aria-hidden
          />

          <ol className="relative flex justify-between gap-1">
            {ACTIVITY_JOURNEY_MAIN_LINE.map((mainStage, index) => {
              const state = mainStepState(mainStage, index)
              const entry = historyByStage.get(mainStage)
              const clickable =
                !readOnly && onStageChange && mainTransitions.includes(mainStage)

              const node = (
                <div className="flex flex-col items-center gap-1 px-0.5">
                  <span
                    className={cn(
                      'relative z-10 grid size-9 place-items-center rounded-full border-2 text-xs font-semibold transition-all',
                      state === 'done' &&
                        'border-emerald-500 bg-emerald-500 text-white shadow-sm',
                      state === 'current' &&
                        'border-primary bg-primary text-primary-foreground shadow-md ring-4 ring-primary/15',
                      state === 'upcoming' &&
                        'border-border bg-background text-muted-foreground',
                      state === 'paused-here' &&
                        'border-orange-500 bg-orange-50 text-orange-900 ring-2 ring-orange-500/20 ring-offset-2 ring-offset-background dark:border-orange-500 dark:bg-orange-950/40 dark:text-orange-100',
                    )}
                  >
                    {state === 'done' ? (
                      <Check aria-hidden className="size-4 stroke-[2.5]" />
                    ) : state === 'paused-here' ? (
                      <Pause aria-hidden className="size-4" />
                    ) : (
                      <span className="tabular-nums">{index + 1}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'max-w-[4.5rem] text-center text-[11px] font-medium leading-tight sm:max-w-[5rem] sm:text-xs',
                      state === 'current' && 'text-primary',
                      state === 'paused-here' && 'font-semibold text-foreground',
                      state === 'done' && 'text-foreground',
                      state === 'upcoming' && 'text-muted-foreground',
                    )}
                  >
                    {mainStage}
                  </span>
                  {entry ? (
                    <span className="text-[10px] leading-none text-muted-foreground">
                      {entry.enteredAt}
                    </span>
                  ) : null}
                  {state === 'current' ? (
                    <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                      Actual
                    </Badge>
                  ) : null}
                </div>
              )

              return (
                <li key={mainStage} className="flex min-w-0 flex-1 justify-center">
                  {clickable ? (
                    <button
                      type="button"
                      className="rounded-lg outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => onStageChange!(mainStage)}
                    >
                      {node}
                    </button>
                  ) : (
                    node
                  )}
                </li>
              )
            })}
          </ol>
        </div>

        <aside
          className={cn(
            'mx-auto max-w-2xl rounded-lg border border-dashed p-4',
            onOffRoute
              ? 'border-rose-300/80 bg-rose-50/80 dark:border-rose-800/50 dark:bg-rose-950/25'
              : 'border-border bg-muted/20',
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg',
                  onOffRoute
                    ? 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <Clock aria-hidden className="size-4" />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Fuera de plazo</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Marca la actividad como vencida desde{' '}
                  <span className="font-medium text-foreground">
                    {ACTIVITY_OFF_ROUTE_ENTRY_MAIN_STAGES.join(' o ')}
                  </span>
                  . Al reanudar, vuelves al estado anterior.
                </p>
              </div>
            </div>
            {onOffRoute && resumeStage && !readOnly && onStageChange ? (
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 gap-1.5 text-xs"
                onClick={() => onStageChange(resumeStage)}
              >
                Reanudar en {resumeStage}
                <ArrowRight aria-hidden className="size-3.5" />
              </Button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Estado vencida">
            {ACTIVITY_JOURNEY_OFF_ROUTE.map((offStage) => {
              const active = stage === offStage
              const selectable =
                !readOnly && onStageChange && offRouteTransitions.includes(offStage)
              const entry = historyByStage.get(offStage)

              return (
                <label
                  key={offStage}
                  className={cn(
                    'relative flex cursor-default flex-col gap-1 rounded-lg border px-3 py-2.5 transition-colors',
                    active &&
                      'border-rose-500 bg-white shadow-sm ring-1 ring-rose-500/25 dark:border-rose-600 dark:bg-card',
                    !active &&
                      selectable &&
                      'cursor-pointer hover:border-rose-400/60 hover:bg-white dark:hover:bg-card',
                    !active && !selectable && 'border-border/80 bg-background/50 opacity-60',
                  )}
                >
                  <input
                    type="radio"
                    name="activity-off-route"
                    className="sr-only"
                    checked={active}
                    disabled={!selectable}
                    onChange={() => selectable && onStageChange!(offStage)}
                  />
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">{offStage}</span>
                    {active ? (
                      <Badge
                        variant="outline"
                        className="h-5 shrink-0 border-rose-400 bg-rose-100 px-1.5 text-[10px] text-rose-950 dark:border-rose-600 dark:bg-rose-950/60 dark:text-rose-100"
                      >
                        Activa
                      </Badge>
                    ) : null}
                  </span>
                  {entry ? (
                    <span className="text-[10px] text-muted-foreground">{entry.enteredAt}</span>
                  ) : null}
                </label>
              )
            })}
          </div>
        </aside>
      </div>
    </section>
  )
}
