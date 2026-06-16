import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardListItem } from '@/types/dashboard'
import { cn } from '@/lib/utils'

type DashboardRecordListCardProps = {
  title: string
  description?: string
  items: DashboardListItem[]
  className?: string
}

export function DashboardRecordListCard({
  title,
  description,
  items,
  className,
}: DashboardRecordListCardProps) {
  return (
    <Card className={cn('h-full min-w-0 border-border shadow-sm', className)}>
      <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-4">
        <CardTitle className="text-sm font-semibold sm:text-base">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay registros para mostrar.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {items.map((item) => {
              const content = (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-foreground">{item.title}</p>
                      {item.badge ? (
                        <Badge variant="secondary" className="shrink-0 font-normal">
                          {item.badge}
                        </Badge>
                      ) : null}
                    </div>
                    {item.subtitle ? (
                      <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                    ) : null}
                  </div>
                  {item.meta ? (
                    <p className="shrink-0 text-xs font-semibold tabular-nums text-foreground sm:text-sm">
                      {item.meta}
                    </p>
                  ) : null}
                  {item.href ? (
                    <ArrowUpRight
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground group-hover:text-primary"
                    />
                  ) : null}
                </>
              )

              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      to={item.href}
                      className="group flex items-center gap-3 px-3 py-3 transition hover:bg-muted/40"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-3 py-3">{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
