import { Package, TrendingUp, Wrench } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { DashboardViewId } from '@/types/dashboard'

const VIEWS: {
  id: DashboardViewId
  label: string
  shortLabel: string
  icon: typeof TrendingUp
  description: string
}[] = [
  {
    id: 'ventas',
    label: 'Ventas',
    shortLabel: 'Ventas',
    icon: TrendingUp,
    description: 'Pipeline, ingresos y clientes',
  },
  {
    id: 'operaciones',
    label: 'Operaciones',
    shortLabel: 'Ops',
    icon: Wrench,
    description: 'Solicitudes, proyectos y bitácora',
  },
  {
    id: 'abastecimiento',
    label: 'Abastecimiento',
    shortLabel: 'Stock',
    icon: Package,
    description: 'Compras, inventario e ingresos',
  },
]

type DashboardViewSwitcherProps = {
  value: DashboardViewId
  onChange: (view: DashboardViewId) => void
  className?: string
}

export function DashboardViewSwitcher({
  value,
  onChange,
  className,
}: DashboardViewSwitcherProps) {
  return (
    <div
      className={cn(
        'inline-flex w-full min-w-0 flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1 sm:w-auto',
        className,
      )}
      role="tablist"
      aria-label="Vista del dashboard"
    >
      {VIEWS.map(({ id, label, shortLabel, icon: Icon, description }) => {
        const active = value === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`${label}: ${description}`}
            onClick={() => onChange(id)}
            className={cn(
              'inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition sm:flex-none sm:px-4 sm:text-sm',
              active
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
            )}
          >
            <Icon aria-hidden className="size-3.5 shrink-0 sm:size-4" />
            <span className="truncate sm:hidden">{shortLabel}</span>
            <span className="hidden truncate sm:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function dashboardViewMeta(view: DashboardViewId) {
  return VIEWS.find((item) => item.id === view) ?? VIEWS[0]!
}
