import { createElement, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'

import type { ActivityListItem } from '@/data/activities.mock'
import { activityRelatedPath } from '@/lib/activity-display'
import { cn } from '@/lib/utils'

type ActivityRelatedNameLinkProps = {
  row: ActivityListItem
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

export function ActivityRelatedNameLink({
  row,
  className,
  onClick,
}: ActivityRelatedNameLinkProps) {
  if (!row.relatedId?.trim() || !row.relatedName.trim()) {
    return <span className={cn('text-muted-foreground', className)}>—</span>
  }

  return (
    <Link
      to={activityRelatedPath(row.relatedType, row.relatedId)}
      onClick={onClick}
      className={cn(
        'block truncate font-medium text-primary underline-offset-2 hover:underline',
        className,
      )}
    >
      {row.relatedName}
    </Link>
  )
}

/** Para columnas de listado sin usar JSX en archivos `.ts` de config. */
export function renderActivityRelatedNameCell(row: ActivityListItem) {
  return createElement(ActivityRelatedNameLink, {
    row,
    onClick: (e: MouseEvent) => e.stopPropagation(),
  })
}
