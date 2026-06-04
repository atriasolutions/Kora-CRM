import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type DetailRecordHeaderShellProps = {
  editing?: boolean
  media: ReactNode
  body?: ReactNode
  actions?: ReactNode
  metrics?: ReactNode
  footer?: ReactNode
  className?: string
}

/** Cabecera de ficha con layout que evita colapsar títulos cuando hay paneles laterales. */
export function DetailRecordHeaderShell({
  editing = false,
  media,
  body,
  actions,
  metrics,
  footer,
  className,
}: DetailRecordHeaderShellProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm',
        editing ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border',
        className,
      )}
    >
      <div
        className={cn(
          'border-b border-border p-4 sm:p-5 lg:p-6',
          editing ? 'bg-primary/5' : 'bg-gradient-to-br from-muted/40 via-card to-card',
        )}
      >
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
            {media}
            {body ? (
              <div className="min-w-0 flex-1 space-y-2 sm:space-y-3">{body}</div>
            ) : null}
          </div>
          {actions ? (
            <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/60 pt-4 2xl:w-auto 2xl:max-w-full 2xl:shrink-0 2xl:justify-end 2xl:border-t-0 2xl:pt-0">
              {actions}
            </div>
          ) : null}
        </div>
        {metrics}
        {footer}
      </div>
    </section>
  )
}

type DetailMetricsGridProps = {
  children: ReactNode
  className?: string
}

export function DetailMetricsGrid({ children, className }: DetailMetricsGridProps) {
  return (
    <div
      className={cn(
        'mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3 md:grid-cols-3 xl:grid-cols-6',
        className,
      )}
    >
      {children}
    </div>
  )
}

type DetailMetricCardProps = {
  label: string
  value: string
}

export function DetailMetricCard({ label, value }: DetailMetricCardProps) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-muted/20 px-2.5 py-2 sm:px-3">
      <p className="text-[10px] text-muted-foreground sm:text-xs">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold tabular-nums sm:text-lg">
        {value}
      </p>
    </div>
  )
}

export function detailRecordTitleClassName(className?: string) {
  return cn(
    'break-words text-xl font-semibold tracking-tight text-foreground sm:text-2xl',
    className,
  )
}
