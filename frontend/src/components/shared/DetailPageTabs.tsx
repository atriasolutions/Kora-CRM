import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type DetailPageTabsProps = {
  children: ReactNode
  className?: string
  'aria-label': string
}

export function DetailPageTabs({
  children,
  className,
  'aria-label': ariaLabel,
}: DetailPageTabsProps) {
  return (
    <div
      className={cn(
        'flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1',
        '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  )
}

export function detailPageTabClassName(active: boolean) {
  return cn(
    'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:gap-2 sm:px-4 sm:py-2.5',
    active
      ? 'bg-card text-foreground shadow-sm'
      : 'text-muted-foreground hover:text-foreground',
  )
}
