import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Fondo estático liviano (sin blur animado ni filtros costosos). */
export function WelcomePageBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/[0.06] to-transparent" />
    </div>
  )
}

export function WelcomeSectionLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        'text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/70',
        className,
      )}
    >
      {children}
    </p>
  )
}
