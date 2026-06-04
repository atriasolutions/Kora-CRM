import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { ActivityDetail } from '@/data/activity-detail.mock'
import { activityRelatedLabel, activityRelatedPath } from '@/lib/activity-display'
import { normalizeDurationMinutes } from '@/lib/activity-detail-normalize'
import { resolveActivityReminderLabel } from '@/lib/activity-reminder'
import { Link } from 'react-router-dom'

type ActivityDetailSidebarProps = {
  activity: ActivityDetail
}

export function ActivityDetailSidebar({ activity }: ActivityDetailSidebarProps) {
  const durationMinutes = normalizeDurationMinutes(
    activity.durationMinutes,
    activity.type,
  )
  const reminderLabel = resolveActivityReminderLabel(activity)

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Vínculo CRM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">
              {activityRelatedLabel(activity.relatedType)}:{' '}
            </span>
            <Link
              to={activityRelatedPath(activity.relatedType, activity.relatedId)}
              className="font-medium text-primary hover:underline"
            >
              {activity.relatedName}
            </Link>
          </p>
          <p>
            <span className="text-muted-foreground">Empresa: </span>
            <span className="font-medium">{activity.companyName}</span>
          </p>
          <Separator />
          <p>
            <span className="text-muted-foreground">Asignado: </span>
            <span className="font-medium">{activity.assignee}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Programación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Duración estimada: </span>
            <span className="font-medium">{durationMinutes} min</span>
          </p>
          <p>
            <span className="text-muted-foreground">Recordatorio: </span>
            <span className="font-medium">{reminderLabel}</span>
          </p>
          {activity.location ? (
            <p>
              <span className="text-muted-foreground">Lugar: </span>
              {activity.location}
            </p>
          ) : null}
          {activity.outcome ? (
            <p className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-emerald-800 dark:text-emerald-200">
              <span className="font-medium">Resultado: </span>
              {activity.outcome}
            </p>
          ) : null}
        </CardContent>
      </Card>

    </div>
  )
}
