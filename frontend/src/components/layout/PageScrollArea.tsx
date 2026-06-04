import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Área con scroll para páginas de detalle, dashboard y configuración. */
export function PageScrollArea({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-y-contain',
        className,
      )}
    >
      {children}
    </div>
  )
}
