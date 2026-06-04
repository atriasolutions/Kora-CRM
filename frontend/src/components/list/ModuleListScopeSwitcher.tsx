import type { ListScope, ListScopeOption } from '@/lib/list-scope'
import { cn } from '@/lib/utils'

type ModuleListScopeSwitcherProps = {
  value: ListScope
  onChange: (scope: ListScope) => void
  options: ListScopeOption[]
  shortLabels: Record<ListScope, string>
  className?: string
  showLabel?: boolean
}

export function ModuleListScopeSwitcher({
  value,
  onChange,
  options,
  shortLabels,
  className,
  showLabel = false,
}: ModuleListScopeSwitcherProps) {
  return (
    <div
      className={cn('flex shrink-0 items-center gap-2', className)}
      role="group"
      aria-label="Alcance de la lista"
    >
      {showLabel ? (
        <span className="hidden shrink-0 text-xs font-medium text-muted-foreground md:inline">
          Mostrar
        </span>
      ) : null}
      <div
        className={cn(
          'inline-flex shrink-0 flex-nowrap gap-0.5 rounded-lg bg-muted/50 p-1',
          'max-md:w-full max-md:overflow-x-auto',
          '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {options.map(({ id, label, description }) => {
          const active = value === id
          const short = shortLabels[id]
          return (
            <button
              key={id}
              type="button"
              title={description}
              aria-label={label}
              aria-pressed={active}
              onClick={() => onChange(id)}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors md:px-3.5 md:py-2 md:text-sm',
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
              )}
            >
              <span className="md:hidden">{short}</span>
              <span className="hidden md:inline">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
