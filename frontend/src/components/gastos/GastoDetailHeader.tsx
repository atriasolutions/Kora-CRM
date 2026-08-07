import { MoreHorizontal, Pencil, Wallet } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ExpenseDetail } from '@/data/expenses.mock'
import { expenseStatusVariant } from '@/lib/expense-display'
import { useDetailHeaderPermissions } from '@/hooks/use-detail-header-permissions'
import { cn } from '@/lib/utils'

type GastoDetailHeaderProps = {
  expense: ExpenseDetail
  onStartEdit?: () => void
  onArchive?: () => void
}

export function GastoDetailHeader({
  expense,
  onStartEdit,
  onArchive,
}: GastoDetailHeaderProps) {
  const { showEdit, showArchive } = useDetailHeaderPermissions('gastos', {
    onStartEdit,
    onArchive,
  })

  const metrics = [
    { label: 'Monto', value: expense.amount },
    { label: 'Fecha', value: expense.expenseDate },
    { label: 'Categoría', value: expense.category },
    { label: 'Medio de pago', value: expense.paymentMethod },
    { label: 'Responsable', value: expense.owner },
  ]

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-br from-muted/40 via-card to-card p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-background">
              <Wallet aria-hidden className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                  {expense.number}
                </h1>
                <Badge variant={expenseStatusVariant(expense.status)}>{expense.status}</Badge>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">{expense.concept}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {showEdit ? (
              <Button type="button" size="sm" variant="outline" onClick={onStartEdit}>
                <Pencil aria-hidden className="size-4" />
                Editar
              </Button>
            ) : null}
            {showArchive ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="sm" variant="outline" aria-label="Más acciones">
                    <MoreHorizontal aria-hidden className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={onArchive}
                  >
                    Archivar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={cn('rounded-lg border border-border/70 bg-background/60 px-3 py-2')}
            >
              <dt className="text-xs text-muted-foreground">{metric.label}</dt>
              <dd className="mt-0.5 truncate text-sm font-medium">{metric.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
