import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  buildDashboardPeriodOptions,
  findPeriodOption,
  labelForPeriod,
  type DashboardPeriod,
} from '@/lib/dashboard-period'
import { cn } from '@/lib/utils'

const PERIOD_OPTIONS = buildDashboardPeriodOptions()

type DashboardPeriodSelectorProps = {
  value: DashboardPeriod
  onChange: (period: DashboardPeriod) => void
  disabled?: boolean
  className?: string
}

export function DashboardPeriodSelector({
  value,
  onChange,
  disabled,
  className,
}: DashboardPeriodSelectorProps) {
  const selected =
    findPeriodOption(PERIOD_OPTIONS, value) ?? {
      label: labelForPeriod(value),
    }
  const yearOptions = PERIOD_OPTIONS.filter((o) => o.period.mode === 'year')
  const monthOptions = PERIOD_OPTIONS.filter((o) => o.period.mode === 'month')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          type="button"
          disabled={disabled}
          className={cn(
            'h-10 w-full shrink-0 rounded-full px-4 shadow-sm sm:h-10 sm:w-auto sm:min-w-[12rem]',
            className,
          )}
        >
          <span className="truncate text-sm">{selected.label}</span>
          <ChevronDown aria-hidden className="ms-2 size-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[min(70vh,24rem)] w-56 overflow-y-auto">
        <DropdownMenuItem onSelect={() => onChange({ mode: 'years' })}>
          Por años (últimos 5)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Año específico</DropdownMenuLabel>
        <DropdownMenuGroup>
          {yearOptions.map((opt) => (
            <DropdownMenuItem key={opt.id} onSelect={() => onChange(opt.period)}>
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Mes específico</DropdownMenuLabel>
        <DropdownMenuGroup>
          {monthOptions.map((opt) => (
            <DropdownMenuItem key={opt.id} onSelect={() => onChange(opt.period)}>
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
