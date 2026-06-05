import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useShellLayout } from '@/contexts/shell-layout'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import { useActivitiesRegistry } from '@/hooks/use-activities-registry'
import { useActivityReminderSound } from '@/hooks/use-activity-reminder-sound'
import {
  activityPriorityVariant,
  activityRelatedLabel,
  activityStatusVariant,
} from '@/lib/activity-display'
import {
  formatReminderWhenLabel,
  getActivityScheduledTimestamp,
  selectPendingActivitiesForPanel,
  selectReminderDueActivities,
} from '@/lib/pending-activities'
import { ACTIVITIES_UPDATED_EVENT } from '@/lib/realtime-events'
import { cn } from '@/lib/utils'

const PANEL_WIDTH_PX = 320
const REMINDER_TICK_MS = 30_000

function useReminderClock(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const bump = () => setNow(new Date())
    const id = window.setInterval(bump, REMINDER_TICK_MS)
    window.addEventListener(ACTIVITIES_UPDATED_EVENT, bump)
    return () => {
      window.clearInterval(id)
      window.removeEventListener(ACTIVITIES_UPDATED_EVENT, bump)
    }
  }, [])

  return now
}

const activityTypeMeta: Record<
  ContactActivityType,
  { Icon: LucideIcon; color: string; bg: string }
> = {
  llamada: {
    Icon: Phone,
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-100 dark:bg-emerald-950',
  },
  email: {
    Icon: Mail,
    color: 'text-sky-700 dark:text-sky-300',
    bg: 'bg-sky-100 dark:bg-sky-950',
  },
  reunion: {
    Icon: Calendar,
    color: 'text-violet-700 dark:text-violet-300',
    bg: 'bg-violet-100 dark:bg-violet-950',
  },
  nota: {
    Icon: StickyNote,
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-100 dark:bg-amber-950',
  },
  whatsapp: {
    Icon: MessageCircle,
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-100 dark:bg-green-950',
  },
}

export function RightPanel() {
  const navigate = useNavigate()
  const { featuredContactOpen, toggleFeaturedContact } = useShellLayout()
  const { allActivities, registryHydrated } = useActivitiesRegistry()
  const now = useReminderClock()

  const pendingActivities = useMemo(
    () => selectPendingActivitiesForPanel(allActivities, now),
    [allActivities, now],
  )

  const reminderDueActivities = useMemo(
    () => selectReminderDueActivities(allActivities, now),
    [allActivities, now],
  )

  useActivityReminderSound(reminderDueActivities, { registryHydrated })

  return (
    <div className="relative hidden shrink-0 xl:block">
      <button
        type="button"
        aria-expanded={featuredContactOpen}
        aria-controls="pending-activities-panel"
        aria-label={
          featuredContactOpen
            ? 'Ocultar actividades pendientes'
            : 'Mostrar actividades pendientes'
        }
        onClick={toggleFeaturedContact}
        title={
          featuredContactOpen
            ? 'Ocultar actividades pendientes'
            : 'Mostrar actividades pendientes'
        }
        className={cn(
          'absolute top-[42%] z-30 flex -translate-y-1/2 items-center justify-center',
          'border shadow-md transition-all duration-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          featuredContactOpen
            ? '-left-4 size-8 rounded-full border-border/80 bg-card text-muted-foreground shadow-sm hover:border-primary/30 hover:bg-muted hover:text-foreground'
            : 'relative left-0 flex h-[4.25rem] w-10 -translate-x-full flex-col gap-0.5 rounded-l-xl rounded-r-none border-primary/40 bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.55)] ring-2 ring-primary/25 hover:from-primary/95 hover:to-primary/80',
        )}
      >
        {featuredContactOpen ? (
          <ChevronRight aria-hidden className="size-4" />
        ) : (
          <>
            <ClipboardList aria-hidden className="size-4 shrink-0" />
            <ChevronLeft aria-hidden className="size-4 shrink-0" />
            {pendingActivities.length > 0 ? (
              <span
                className="absolute -end-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white ring-2 ring-primary"
                aria-hidden
              >
                {pendingActivities.length > 99 ? '99+' : pendingActivities.length}
              </span>
            ) : null}
          </>
        )}
      </button>

      <aside
        id="pending-activities-panel"
        aria-hidden={!featuredContactOpen}
        className={cn(
          'flex h-full flex-col overflow-hidden border-l bg-gradient-to-b from-card via-card to-muted/20',
          'shadow-[-8px_0_32px_-20px_rgba(15,23,42,0.12)]',
          'transition-[width,border-color,box-shadow] duration-300 ease-in-out',
          featuredContactOpen ? 'border-border/80' : 'border-transparent',
        )}
        style={{ width: featuredContactOpen ? PANEL_WIDTH_PX : 0 }}
      >
        <div
          className="flex h-full min-h-0 flex-col"
          style={{ width: PANEL_WIDTH_PX }}
        >
          <div className="border-b border-border/70 bg-gradient-to-br from-primary/[0.09] via-card to-card px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20">
                <ClipboardList aria-hidden className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary/80">
                  Actividades pendientes
                </p>
                {pendingActivities.length > 0 ? (
                  <p className="mt-0.5 text-sm font-medium text-foreground">
                    {pendingActivities.length}{' '}
                    {pendingActivities.length === 1 ? 'asignada' : 'asignadas'}
                  </p>
                ) : null}
              </div>
            </div>
            {pendingActivities.length > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Aparecen cuando llega el recordatorio o la fecha programada
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Tus actividades aparecerán aquí cuando llegue su recordatorio o fecha
                programada.
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {!registryHydrated ? (
              <Card className="border-dashed border-border/80 bg-muted/20 shadow-none">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Cargando tus actividades…
                </CardContent>
              </Card>
            ) : pendingActivities.length === 0 ? (
              <Card className="border-dashed border-border/80 bg-muted/20 shadow-none">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  No tienes actividades pendientes asignadas. Crea una actividad o pide
                  que te asignen una desde el módulo Actividades.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  Mis actividades
                </h3>
                <ul className="space-y-3">
                  {pendingActivities.map((activity) => {
                    const meta = activityTypeMeta[activity.type]
                    const dueTs = getActivityScheduledTimestamp(activity)
                    const dueLabel =
                      dueTs != null ? formatReminderWhenLabel(dueTs, now) : activity.due
                    const openActivity = () => navigate(`/actividades/${activity.id}`)

                    return (
                      <li key={activity.id}>
                        <button
                          type="button"
                          onClick={openActivity}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              openActivity()
                            }
                          }}
                          className={cn(
                            'group flex w-full cursor-pointer gap-3 rounded-xl border border-border/80',
                            'bg-background/90 p-3 text-left shadow-sm transition-all',
                            'hover:border-primary/35 hover:bg-primary/[0.03] hover:shadow-md',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          )}
                          aria-label={`Ver actividad: ${activity.title}`}
                        >
                          <span
                            className={cn(
                              'grid size-9 shrink-0 place-items-center rounded-full',
                              meta.bg,
                            )}
                          >
                            <meta.Icon
                              aria-hidden
                              className={cn('size-4', meta.color)}
                            />
                          </span>
                          <span className="min-w-0 flex-1 space-y-2">
                            <span className="flex flex-wrap items-baseline gap-2">
                              <span className="text-sm font-medium text-foreground group-hover:text-primary">
                                {activity.title}
                              </span>
                              <span className="text-xs font-medium text-primary">
                                {dueLabel}
                              </span>
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {activityRelatedLabel(activity.relatedType)}:{' '}
                              <span className="font-medium text-foreground">
                                {activity.relatedName}
                              </span>
                              {activity.companyName &&
                              activity.companyName !== activity.relatedName ? (
                                <> · {activity.companyName}</>
                              ) : null}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              Actividad: {activity.due}
                              {activity.reminder ? (
                                <> · Recordatorio: {activity.reminder}</>
                              ) : null}
                            </span>
                            <span className="flex flex-wrap items-center gap-2">
                              <Badge variant={activityPriorityVariant(activity.priority)}>
                                {activity.priority}
                              </Badge>
                              <Badge variant={activityStatusVariant(activity.status)}>
                                {activity.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {activity.assignee}
                              </span>
                            </span>
                          </span>
                          <ChevronRight
                            aria-hidden
                            className="mt-1 size-4 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100"
                          />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <p className="mt-4 text-center">
              <Link
                to="/actividades"
                className="inline-flex items-center justify-center rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 hover:underline"
              >
                Ver todas las actividades
              </Link>
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
