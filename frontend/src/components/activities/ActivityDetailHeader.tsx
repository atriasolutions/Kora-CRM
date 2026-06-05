import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Link2,
  MoreHorizontal,
  Pencil,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ActivityDetail } from '@/data/activity-detail.mock'
import type { ActivityPriority, ActivityStatus } from '@/data/activities.mock'
import {
  activityPriorityVariant,
  activityRelatedLabel,
  activityRelatedPath,
  activityStatusVariant,
} from '@/lib/activity-display'
import { activityTypeColors, activityTypeIcons } from '@/lib/activity-icons'
import {
  ACTIVITY_PRIORITY_OPTIONS,
  ACTIVITY_STATUS_OPTIONS,
  type ActivityFormValues,
} from '@/lib/activity-form'
import { normalizeDurationMinutes } from '@/lib/activity-detail-normalize'
import { resolveActivityReminderLabel } from '@/lib/activity-reminder'
import { formatChileDateTimeLabel, parseChileDatetimeInput } from '@/lib/chile-timezone'
import { useDetailHeaderPermissions } from '@/hooks/use-detail-header-permissions'
import { cn } from '@/lib/utils'

type ActivityDetailHeaderProps = {
  activity: ActivityDetail
  isEditing?: boolean
  form?: ActivityFormValues
  onFormChange?: (patch: Partial<ActivityFormValues>) => void
  onStartEdit?: () => void
  onMarkComplete?: () => void
  onArchive?: () => void
}

export function ActivityDetailHeader({
  activity,
  isEditing = false,
  form,
  onFormChange,
  onStartEdit,
  onMarkComplete,
  onArchive,
}: ActivityDetailHeaderProps) {
  const { showEdit, showArchive } = useDetailHeaderPermissions('actividades', {
    onStartEdit,
    onArchive,
  })

  const displayTitle = isEditing && form ? form.title : activity.title
  const displayStatus = isEditing && form ? form.status : activity.status
  const displayPriority = isEditing && form ? form.priority : activity.priority
  const Icon = activityTypeIcons[activity.type]
  const colors = activityTypeColors[activity.type]

  const durationLabel = `${normalizeDurationMinutes(activity.durationMinutes, activity.type)} min`
  const reminderLabel = resolveActivityReminderLabel(activity)

  const metrics = [
    { label: 'Vencimiento', value: activity.due },
    { label: 'Duración', value: durationLabel },
    { label: 'Asignado', value: activity.assignee },
    { label: 'Empresa', value: activity.companyName },
    { label: 'Recordatorio', value: reminderLabel },
  ]

  const patch = (partial: Partial<ActivityFormValues>) => {
    onFormChange?.(partial)
  }

  const relatedPath = activityRelatedPath(activity.relatedType, activity.relatedId)

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm',
        isEditing ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border',
      )}
    >
      <div
        className={cn(
          'border-b border-border p-4 sm:p-5 lg:p-6',
          isEditing ? 'bg-primary/5' : 'bg-gradient-to-br from-muted/40 via-card to-card',
        )}
      >
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
            <div
              className={cn(
                'grid size-14 shrink-0 place-items-center rounded-xl border border-border sm:size-16',
                colors.bg,
              )}
            >
              <Icon aria-hidden className={cn('size-7 sm:size-8', colors.color)} />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {isEditing && form ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <ContactFormInput
                    id="act-header-title"
                    label="Título"
                    value={form.title}
                    className="sm:col-span-2"
                    onChange={(title) => patch({ title })}
                  />
                  <ContactFormSelect
                    id="act-header-status"
                    label="Estado"
                    value={form.status}
                    onChange={(status) => patch({ status: status as ActivityStatus })}
                    options={ACTIVITY_STATUS_OPTIONS.map((s) => ({
                      value: s,
                      label: s,
                    }))}
                  />
                  <ContactFormSelect
                    id="act-header-priority"
                    label="Prioridad"
                    value={form.priority}
                    onChange={(priority) =>
                      patch({ priority: priority as ActivityPriority })
                    }
                    options={ACTIVITY_PRIORITY_OPTIONS.map((p) => ({
                      value: p,
                      label: p,
                    }))}
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">
                      {displayTitle}
                    </h1>
                    <Badge variant={activityStatusVariant(displayStatus)}>
                      {displayStatus}
                    </Badge>
                    <Badge variant={activityPriorityVariant(displayPriority)}>
                      {displayPriority}
                    </Badge>
                    <Badge variant="outline">{activity.typeLabel}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Link
                      to={relatedPath}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Link2 aria-hidden className="size-4" />
                      {activityRelatedLabel(activity.relatedType)}: {activity.relatedName}
                    </Link>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Building2 aria-hidden className="size-4" />
                      {activity.companyName}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {!isEditing ? (
            <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/60 pt-4 2xl:w-auto 2xl:shrink-0 2xl:border-t-0 2xl:pt-0">
              {activity.status !== 'Completada' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border shadow-sm"
                  onClick={onMarkComplete}
                >
                  <CheckCircle2 aria-hidden className="size-4" />
                  Completar
                </Button>
              ) : null}
              {showEdit ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border shadow-sm"
                  onClick={onStartEdit}
                >
                  <Pencil aria-hidden className="size-4" />
                  Editar
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="border-border shadow-sm">
                    <MoreHorizontal aria-hidden className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Duplicar</DropdownMenuItem>
                  {showArchive ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={onArchive}
                      >
                        Archivar
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map(({ label, value }) => (
            <div
              key={label}
              className="rounded-lg border border-border bg-muted/20 px-2.5 py-2 sm:px-3"
            >
              <p className="text-[10px] text-muted-foreground sm:text-xs">{label}</p>
              <p className="mt-0.5 truncate text-sm font-semibold sm:text-base">{value}</p>
            </div>
          ))}
        </div>

        {!isEditing ? (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar aria-hidden className="size-4" />
              Programada:{' '}
              {formatChileDateTimeLabel(
                parseChileDatetimeInput(activity.scheduledAt) ??
                  activity.scheduledAt ??
                  activity.due,
              )}
            </span>
            {activity.completedAt ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 aria-hidden className="size-4" />
                Completada: {activity.completedAt}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Clock aria-hidden className="size-4" />
                Pendiente de cierre
              </span>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
