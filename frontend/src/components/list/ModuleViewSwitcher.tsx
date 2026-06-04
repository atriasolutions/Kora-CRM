import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export type ModuleViewOption<T extends string> = {
  id: T
  label: string
  description: string
  Icon: LucideIcon
}

type ModuleViewSwitcherProps<T extends string> = {
  value: T
  onChange: (view: T) => void
  options: ModuleViewOption<T>[]
  tablistAriaLabel: string
  archivedViewId?: T
  archivedCount?: number
  className?: string
  showLabel?: boolean
  captionPosition?: 'above' | 'below'
}

export function ModuleViewSwitcher<T extends string>({
  value,
  onChange,
  options,
  tablistAriaLabel,
  archivedViewId,
  archivedCount = 0,
  className,
  showLabel = false,
  captionPosition = 'below',
}: ModuleViewSwitcherProps<T>) {
  const activeOption = options.find((o) => o.id === value)

  const caption = activeOption ? (
    <p className="min-w-0 text-xs leading-snug" title={activeOption.description}>
      <span className="font-medium text-foreground">{activeOption.label}</span>
      <span className="hidden text-muted-foreground md:inline">
        {' '}
        · {activeOption.description}
      </span>
    </p>
  ) : null

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1',
        showLabel ? 'shrink-0' : 'w-full md:w-auto',
        className,
      )}
    >
      {captionPosition === 'above' ? caption : null}

      <div className="flex min-w-0 items-center gap-2">
        {showLabel ? (
          <span className="hidden shrink-0 text-xs font-medium text-muted-foreground md:inline">
            Vista
          </span>
        ) : null}
        <div
          role="tablist"
          aria-label={
            activeOption
              ? `${tablistAriaLabel}: ${activeOption.label}`
              : tablistAriaLabel
          }
          className={cn(
            'inline-flex shrink-0 flex-nowrap gap-0.5 rounded-lg bg-muted/50 p-1',
            'max-md:max-w-full max-md:overflow-x-auto',
            '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {options.map(({ id, label, description, Icon }) => {
            const active = value === id
            const badge =
              archivedViewId !== undefined &&
              id === archivedViewId &&
              archivedCount > 0
                ? archivedCount
                : null

            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={label}
                title={description}
                onClick={() => onChange(id)}
                className={cn(
                  'relative inline-flex size-9 shrink-0 items-center justify-center rounded-md transition-colors',
                  active
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-border/60'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                )}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                {badge !== null ? (
                  <span className="absolute -end-0.5 -top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold leading-none text-primary-foreground">
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {captionPosition === 'below' ? caption : null}
    </div>
  )
}
