import {
  Calendar,
  ChevronRight,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ContactActivity, ContactActivityType } from '@/data/contact-detail.mock'
import { outreachResultLabel } from '@/lib/contact-outreach'
import {
  activityDetailPath,
  activityPriorityVariant,
  activityRelatedLabel,
  activityRelatedPath,
  activityStatusVariant,
} from '@/lib/activity-display'
import { cn } from '@/lib/utils'

const activityMeta: Record<
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

type ContactActivitiesPanelProps = {
  activities: ContactActivity[]
  onRegister?: () => void
  disabled?: boolean
  /** Registro asociado para textos vacíos (por defecto: contacto). */
  entityKind?:
    | 'contacto'
    | 'empresa'
    | 'compra'
    | 'inventario'
    | 'oportunidad'
    | 'cotizacion'
    | 'factura'
    | 'proyecto'
    | 'solicitud'
    | 'ingreso'
    | 'producto'
}

type StatusFilter = 'todas' | 'activas' | 'completadas' | 'vencidas'

function ActivityRelatedLine({ activity }: { activity: ContactActivity }) {
  if (!activity.relatedType || !activity.relatedId?.trim() || !activity.relatedName?.trim()) {
    return null
  }

  return (
    <p className="text-xs text-muted-foreground">
      {activityRelatedLabel(activity.relatedType)}:{' '}
      <Link
        to={activityRelatedPath(activity.relatedType, activity.relatedId)}
        onClick={(e) => e.stopPropagation()}
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        {activity.relatedName}
      </Link>
      {activity.companyName && activity.companyName !== activity.relatedName ? (
        <> · {activity.companyName}</>
      ) : null}
    </p>
  )
}

function ActivityRow({ activity }: { activity: ContactActivity }) {
  const meta = activityMeta[activity.type]

  return (
    <div className="flex items-stretch gap-3 px-4 py-3 sm:gap-4">
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center self-center rounded-full sm:size-11',
          meta.bg,
        )}
      >
        <meta.Icon aria-hidden className={cn('size-4', meta.color)} />
      </span>

      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-medium leading-snug text-foreground">{activity.title}</p>
        <ActivityRelatedLine activity={activity} />
        {activity.description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {activity.description}
            </p>
          ) : null}
        <div className="flex flex-col gap-2.5 rounded-lg bg-muted/40 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge variant={activityStatusVariant(activity.status ?? 'Pendiente')}>
              {activity.status ?? 'Pendiente'}
            </Badge>
            {activity.outreachResult ? (
              <Badge variant="outline" className="text-[10px]">
                {outreachResultLabel(activity.outreachResult)}
              </Badge>
            ) : null}
            <Badge variant={activityPriorityVariant(activity.priority ?? 'Media')}>
              {activity.priority ?? 'Media'}
            </Badge>
            <span className="text-xs text-muted-foreground">{activity.author}</span>
            {!activity.recordId ? (
              <Badge variant="outline" className="text-[10px]">
                Solo timeline
              </Badge>
            ) : null}
          </div>
          <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs sm:shrink-0">
            <div className="inline-flex items-baseline gap-1">
              <dt className="font-medium text-muted-foreground">Programada</dt>
              <dd className="tabular-nums text-foreground">{activity.when}</dd>
            </div>
            <div className="inline-flex items-baseline gap-1">
              <dt className="font-medium text-muted-foreground">Creada</dt>
              <dd className="tabular-nums text-muted-foreground">
                {activity.createdAt ?? '—'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {activity.recordId ? (
        <ChevronRight
          aria-hidden
          className="size-5 shrink-0 self-center text-muted-foreground"
        />
      ) : null}
    </div>
  )
}

export function ContactActivitiesPanel({
  activities,
  onRegister,
  disabled = false,
  entityKind = 'contacto',
}: ContactActivitiesPanelProps) {
  const entityLabel =
    entityKind === 'empresa'
      ? 'empresa'
      : entityKind === 'compra'
        ? 'compra'
        : entityKind === 'inventario'
          ? 'registro de inventario'
          : entityKind === 'oportunidad'
            ? 'oportunidad'
            : entityKind === 'cotizacion'
              ? 'cotización'
              : entityKind === 'factura'
                ? 'factura'
                : entityKind === 'proyecto'
                  ? 'proyecto'
                  : entityKind === 'solicitud'
                    ? 'solicitud'
                    : entityKind === 'ingreso'
                    ? 'ingreso'
                    : entityKind === 'producto'
                      ? 'producto'
                      : 'contacto'
  const [filter, setFilter] = useState<StatusFilter>('todas')

  const resolveStatus = (a: ContactActivity) => a.status ?? 'Pendiente'

  const stats = useMemo(() => {
    const pendiente = activities.filter((a) => resolveStatus(a) === 'Pendiente').length
    const enCurso = activities.filter((a) => resolveStatus(a) === 'En curso').length
    const vencida = activities.filter((a) => resolveStatus(a) === 'Vencida').length
    const completada = activities.filter((a) => resolveStatus(a) === 'Completada').length
    return { pendiente, enCurso, vencida, completada }
  }, [activities])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'activas':
        return activities.filter(
          (a) =>
            resolveStatus(a) === 'Pendiente' || resolveStatus(a) === 'En curso',
        )
      case 'completadas':
        return activities.filter((a) => resolveStatus(a) === 'Completada')
      case 'vencidas':
        return activities.filter((a) => resolveStatus(a) === 'Vencida')
      default:
        return activities
    }
  }, [activities, filter])

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/15 px-6 py-14 text-center">
        <p className="text-sm font-medium text-foreground">Sin actividades</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Registra llamadas, reuniones o seguimientos para llevar el historial de la{' '}
          {entityLabel}.
        </p>
        {onRegister ? (
          <Button className="mt-4" disabled={disabled} onClick={onRegister}>
            Registrar actividad
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-4">
        {[
          { label: 'Pendientes', value: stats.pendiente, tone: 'text-sky-700' },
          { label: 'En curso', value: stats.enCurso, tone: 'text-violet-700' },
          { label: 'Vencidas', value: stats.vencida, tone: 'text-rose-700' },
          { label: 'Completadas', value: stats.completada, tone: 'text-emerald-700' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm"
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn('text-xl font-semibold tabular-nums', s.tone)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['todas', 'Todas'],
            ['activas', 'Activas'],
            ['vencidas', 'Vencidas'],
            ['completadas', 'Completadas'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={filter === id ? 'default' : 'outline'}
            className={filter !== id ? 'border-border' : undefined}
            onClick={() => setFilter(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <ol className="space-y-2">
        {filtered.map((activity) => {
          const detailHref = activityDetailPath(activity.recordId)
          const inner = (
            <div
              className={cn(
                'rounded-xl border border-border bg-card transition-colors',
                detailHref && 'hover:border-primary/30 hover:bg-muted/20',
              )}
            >
              <ActivityRow activity={activity} />
            </div>
          )

          if (detailHref) {
            return (
              <li key={activity.id}>
                <Link
                  to={detailHref}
                  className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Ver actividad: ${activity.title}`}
                >
                  {inner}
                </Link>
              </li>
            )
          }

          return <li key={activity.id}>{inner}</li>
        })}
      </ol>
    </div>
  )
}
