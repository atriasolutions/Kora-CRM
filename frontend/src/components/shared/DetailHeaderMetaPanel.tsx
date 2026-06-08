import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type DetailHeaderMetaPanelProps = {
  children: ReactNode
  className?: string
}

/** Panel de datos de contacto/empresa: ancho completo, grid responsivo. */
export function DetailHeaderMetaPanel({ children, className }: DetailHeaderMetaPanelProps) {
  return (
    <div
      className={cn(
        'mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border/80 bg-border/70 sm:grid-cols-2',
        className,
      )}
    >
      {children}
    </div>
  )
}

type DetailHeaderMetaCellProps = {
  icon: LucideIcon
  label: string
  children: ReactNode
  /** Ocupa toda la fila (direcciones, textos largos). */
  fullWidth?: boolean
  className?: string
}

export function DetailHeaderMetaCell({
  icon: Icon,
  label,
  children,
  fullWidth = false,
  className,
}: DetailHeaderMetaCellProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 gap-3 bg-card p-3.5 sm:p-4',
        fullWidth && 'sm:col-span-2',
        className,
      )}
    >
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/80 ring-1 ring-border/60"
        aria-hidden
      >
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="mt-1 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere]">
          {children}
        </div>
      </div>
    </div>
  )
}
