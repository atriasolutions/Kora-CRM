import { ArrowLeft, ArrowRight, Check, ChevronRight, FileSpreadsheet, Pause } from 'lucide-react'
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
import type { QuoteStatusHistoryEntry } from '@/lib/quote-journey'
import {
  QUOTE_JOURNEY_MAIN_LINE,
  QUOTE_JOURNEY_OFF_ROUTE,
  QUOTE_OFF_ROUTE_ENTRY_MAIN_STAGES,
  getAllowedTransitions,
  getMainLineTransitions,
  getOffRouteTransitions,
  getPreviousMainStage,
  getResumeMainStage,
  inferPausedFromMainStage,
  isMainLineStage,
  isOffRouteStage,
  type QuoteJourneyStage,
} from '@/lib/quote-journey'
import { cn } from '@/lib/utils'

type QuoteSuccessPathProps = {
  currentStage: QuoteJourneyStage
  history?: QuoteStatusHistoryEntry[]
  readOnly?: boolean
  onStageChange?: (stage: QuoteJourneyStage) => void
  className?: string
}

type MainStepState = 'done' | 'current' | 'upcoming' | 'paused-here'

function shortMainLabel(stage: string) {
  if (stage === 'En revisión interna') return 'Revisión'
  if (stage === 'En negociación') return 'Negociación'
  return stage
}

function shortOffRouteLabel(stage: string) {
  if (stage === 'En espera cliente') return 'Espera cliente'
  return stage
}

export function QuoteSuccessPath({
  currentStage,
  history = [],
  readOnly = false,
  onStageChange,
  className,
}: QuoteSuccessPathProps) {
  const historyByStage = useMemo(
    () => new Map(history.map((h) => [h.status, h])),
    [history],
  )

  const onOffRoute = isOffRouteStage(currentStage)
  const pausedFrom = inferPausedFromMainStage(currentStage, history)
  const pausedFromIndex = QUOTE_JOURNEY_MAIN_LINE.indexOf(pausedFrom)
  const mainIndex = QUOTE_JOURNEY_MAIN_LINE.indexOf(
    currentStage as (typeof QUOTE_JOURNEY_MAIN_LINE)[number],
  )

  const progressIndex = onOffRoute
    ? pausedFromIndex
    : mainIndex >= 0
      ? mainIndex
      : 0

  const progressPct =
    QUOTE_JOURNEY_MAIN_LINE.length > 1
      ? (progressIndex / (QUOTE_JOURNEY_MAIN_LINE.length - 1)) * 100
      : 0

  const transitionCtx = useMemo(() => ({ history }), [history])
  const resumeStage = onOffRoute ? getResumeMainStage(currentStage, history) : null
  const mainTransitions = getMainLineTransitions(currentStage, transitionCtx)
  const offRouteTransitions = getOffRouteTransitions(currentStage)
  const allTransitions = getAllowedTransitions(currentStage, transitionCtx)
  const showOffRoutePanel = currentStage !== 'Aceptada'
  const previousMain =
    isMainLineStage(currentStage) ? getPreviousMainStage(currentStage) : null
  const canGoBack =
    previousMain !== null && mainTransitions.includes(previousMain)

  const mainStepState = (
    stage: (typeof QUOTE_JOURNEY_MAIN_LINE)[number],
    index: number,
  ): MainStepState => {
    if (onOffRoute && stage === pausedFrom) return 'paused-here'
    if (!onOffRoute && currentStage === stage) return 'current'
    if (index < progressIndex) return 'done'
    return 'upcoming'
  }

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-sm',
        className,
      )}
      aria-label="Ruta del éxito de la cotización"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileSpreadsheet aria-hidden className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Ruta del éxito</h3>
            <p className="text-xs text-muted-foreground">
              {onOffRoute ? (
                <>
                  Fuera de ruta · retoma en:{' '}
                  <span className="font-medium text-foreground">{pausedFrom}</span>
                </>
              ) : (
                <>
                  Etapa actual:{' '}
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
                  Todas las etapas
                  <ChevronRight aria-hidden className="ms-1 size-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-[min(360px,70vh)] w-56 overflow-y-auto"
              >
                <DropdownMenuLabel>Desde «{currentStage}»</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allTransitions.length > 0 ? (
                  allTransitions.map((stage) => (
                    <DropdownMenuItem key={stage} onSelect={() => onStageChange(stage)}>
                      {stage}
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

      <div className="space-y-4 p-3 sm:p-4 md:p-5">
        <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0 md:overflow-visible">
          <div className="relative mx-auto min-w-[640px] max-w-4xl md:min-w-0">
          <p className="mb-3 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Flujo principal
          </p>
          <div
            className="absolute left-[4%] right-[4%] top-[1.15rem] h-0.5 rounded-full bg-border"
            aria-hidden
          />
          <div
            className="absolute left-[4%] top-[1.15rem] h-0.5 rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${progressPct * 0.92}%` }}
            aria-hidden
          />

          <ol className="relative flex justify-between gap-0.5">
            {QUOTE_JOURNEY_MAIN_LINE.map((stage, index) => {
              const state = mainStepState(stage, index)
              const entry = historyByStage.get(stage)
              const clickable =
                !readOnly && onStageChange && mainTransitions.includes(stage)

              const node = (
                <div className="flex flex-col items-center gap-1 px-0.5">
                  <span
                    className={cn(
                      'relative z-10 grid size-8 place-items-center rounded-full border-2 text-xs font-semibold transition-all',
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
                      <Check aria-hidden className="size-3.5 stroke-[2.5]" />
                    ) : state === 'paused-here' ? (
                      <Pause aria-hidden className="size-3.5" />
                    ) : (
                      <span className="tabular-nums">{index + 1}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'max-w-[3.5rem] text-center text-[10px] font-medium leading-tight sm:max-w-[4.25rem] sm:text-[11px]',
                      state === 'current' && 'text-primary',
                      state === 'paused-here' && 'font-semibold text-foreground',
                      state === 'done' && 'text-foreground',
                      state === 'upcoming' && 'text-muted-foreground',
                    )}
                  >
                    {shortMainLabel(stage)}
                  </span>
                  {entry ? (
                    <span className="hidden text-[10px] leading-none text-muted-foreground sm:inline">
                      {entry.at}
                    </span>
                  ) : null}
                  {state === 'current' ? (
                    <Badge variant="default" className="hidden h-5 px-1.5 text-[10px] sm:inline-flex">
                      Actual
                    </Badge>
                  ) : state === 'paused-here' ? (
                    <Badge
                      variant="outline"
                      className="hidden h-5 border-orange-300 bg-orange-50 px-1.5 text-[10px] font-medium text-orange-950 dark:border-orange-700 dark:bg-orange-950/50 dark:text-orange-100 sm:inline-flex"
                    >
                      Pausado aquí
                    </Badge>
                  ) : null}
                </div>
              )

              return (
                <li key={stage} className="flex min-w-0 flex-1 justify-center">
                  {clickable ? (
                    <button
                      type="button"
                      className="rounded-lg outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => onStageChange!(stage)}
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
        </div>

        {showOffRoutePanel ? (
          <aside
            className={cn(
              'mx-auto max-w-4xl rounded-lg border border-dashed p-3 sm:p-4',
              onOffRoute
                ? 'border-orange-300/80 bg-orange-50/80 dark:border-orange-800/50 dark:bg-orange-950/25'
                : 'border-border bg-muted/20',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg',
                    onOffRoute
                      ? 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Pause aria-hidden className="size-4" />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Fuera de la ruta</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Espera del cliente, rechazo, vencimiento o cancelación. Disponible desde{' '}
                    <span className="font-medium text-foreground">
                      {QUOTE_OFF_ROUTE_ENTRY_MAIN_STAGES.map(shortMainLabel).join(', ')}
                    </span>
                    . Al reanudar, vuelves a la etapa desde la que saliste.
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
                  Reanudar en {shortMainLabel(resumeStage)}
                  <ArrowRight aria-hidden className="size-3.5" />
                </Button>
              ) : null}
            </div>

            <div
              className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
              role="radiogroup"
              aria-label="Estado fuera de ruta"
            >
              {QUOTE_JOURNEY_OFF_ROUTE.map((stage) => {
                const active = currentStage === stage
                const selectable =
                  !readOnly && onStageChange && offRouteTransitions.includes(stage)
                const entry = historyByStage.get(stage)

                return (
                  <label
                    key={stage}
                    className={cn(
                      'relative flex cursor-default flex-col gap-1 rounded-lg border px-3 py-2.5 transition-colors',
                      active &&
                        'border-orange-500 bg-white shadow-sm ring-1 ring-orange-500/25 dark:border-orange-600 dark:bg-card',
                      !active &&
                        selectable &&
                        'cursor-pointer hover:border-orange-400/60 hover:bg-white dark:hover:bg-card',
                      !active && !selectable && 'border-border/80 bg-background/50 opacity-60',
                    )}
                  >
                    <input
                      type="radio"
                      name="quote-off-route"
                      className="sr-only"
                      checked={active}
                      disabled={!selectable}
                      onChange={() => selectable && onStageChange!(stage)}
                    />
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold leading-tight text-foreground">
                        {shortOffRouteLabel(stage)}
                      </span>
                      {active ? (
                        <Badge
                          variant="outline"
                          className="h-5 shrink-0 border-orange-400 bg-orange-100 px-1.5 text-[10px] text-orange-950 dark:border-orange-600 dark:bg-orange-950/60 dark:text-orange-100"
                        >
                          Activa
                        </Badge>
                      ) : null}
                    </span>
                    <span className="text-[11px] leading-snug text-muted-foreground">{stage}</span>
                    {entry ? (
                      <span className="text-[10px] text-muted-foreground">{entry.at}</span>
                    ) : null}
                  </label>
                )
              })}
            </div>

            {!onOffRoute && offRouteTransitions.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Avanza al menos a{' '}
                <strong className="font-medium text-foreground">En revisión interna</strong> para
                registrar un estado fuera de ruta.
              </p>
            ) : null}
          </aside>
        ) : null}
      </div>
    </section>
  )
}
