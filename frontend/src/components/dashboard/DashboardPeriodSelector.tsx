import { CalendarRange, ChevronDown } from 'lucide-react'

import { CompactPeriodFilter } from '@/components/shared/CompactPeriodFilter'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  compactToDashboardPeriod,
  dashboardPeriodToCompact,
  labelForPeriod,
  type DashboardPeriod,
} from '@/lib/dashboard-period'
import { cn } from '@/lib/utils'

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          type="button"
          disabled={disabled}
          className={cn(
            'h-10 w-full shrink-0 gap-2 rounded-full px-4 shadow-sm sm:h-10 sm:w-auto sm:min-w-[12rem]',
            className,
          )}
        >
          <CalendarRange aria-hidden className="size-4 shrink-0 opacity-70" />
          <span className="truncate text-sm">{labelForPeriod(value)}</span>
          <ChevronDown aria-hidden className="size-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-3" onCloseAutoFocus={(e) => e.preventDefault()}>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Período del dashboard</p>
        <CompactPeriodFilter
          idPrefix="dashboard-period"
          modes={['years', 'year', 'month']}
          value={dashboardPeriodToCompact(value)}
          onChange={(next) => onChange(compactToDashboardPeriod(next))}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
