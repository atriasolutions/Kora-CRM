import { Mail, MessagesSquare, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { PendingActivityItem } from '@/types/dashboard'
import { cn } from '@/lib/utils'

function activityIcon(kind?: PendingActivityItem['icon']) {
  switch (kind) {
    case 'mail':
      return Mail
    case 'meeting':
      return MessagesSquare
    case 'call':
    default:
      return Phone
  }
}

const iconTone: Record<NonNullable<PendingActivityItem['icon']> | 'call', string> = {
  call: 'bg-primary/10 text-primary',
  mail: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  meeting: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

type PendingActivitiesCardProps = {
  items: PendingActivityItem[]
  className?: string
}

export function PendingActivitiesCard({ items, className }: PendingActivitiesCardProps) {
  return (
    <Card className={cn('flex h-full min-w-0 flex-col overflow-hidden border-border shadow-sm', className)}>
      <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-4">
        <CardTitle className="text-sm font-semibold sm:text-base">
          Actividades pendientes
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border px-0">
        {items.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-muted-foreground">
            No hay actividades pendientes.
          </p>
        ) : null}
        {items.map((item) => {
          const Icon = activityIcon(item.icon)
          const tone = iconTone[item.icon ?? 'call']
          return (
            <Link
              key={item.id}
              to={`/actividades/${item.id}`}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors active:bg-muted/50 sm:items-start sm:gap-3 sm:px-5 sm:py-4 sm:hover:bg-muted/40"
            >
              <span
                className={cn(
                  'inline-flex size-8 shrink-0 items-center justify-center rounded-lg sm:mt-0.5 sm:size-9',
                  tone,
                )}
              >
                <Icon aria-hidden className="size-3.5 sm:size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {item.title}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-[11px] text-muted-foreground sm:text-xs">
                  <span className="truncate">{item.company}</span>
                  <span aria-hidden className="text-border">·</span>
                  <span className="shrink-0 font-medium text-primary/90">{item.timeLabel}</span>
                </span>
              </span>
            </Link>
          )
        })}
      </CardContent>
      <CardFooter className="border-t border-border px-4 py-2.5 sm:px-6 sm:pt-3">
        <Link
          to="/actividades"
          className="text-xs font-semibold text-primary hover:underline sm:text-sm"
        >
          Ver todas las actividades
        </Link>
      </CardFooter>
    </Card>
  )
}
