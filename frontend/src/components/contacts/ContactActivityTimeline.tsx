import {
  Calendar,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'

import type { ContactActivity, ContactActivityType } from '@/data/contact-detail.mock'
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

type ContactActivityTimelineProps = {
  activities: ContactActivity[]
}

export function ContactActivityTimeline({
  activities,
}: ContactActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aún no hay actividades registradas para este contacto.
      </p>
    )
  }

  return (
    <ol className="relative space-y-0">
      {activities.map((activity, index) => {
        const meta = activityMeta[activity.type]
        const isLast = index === activities.length - 1
        return (
          <li key={activity.id} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast ? (
              <span
                aria-hidden
                className="absolute start-[19px] top-10 bottom-0 w-px bg-border"
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full',
                meta.bg,
              )}
            >
              <meta.Icon aria-hidden className={cn('size-4', meta.color)} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-foreground">{activity.title}</p>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {activity.when}
                </time>
              </div>
              {activity.description ? (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {activity.description}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                por {activity.author}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
