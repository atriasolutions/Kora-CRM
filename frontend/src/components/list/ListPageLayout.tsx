import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type ListPageLayoutProps = {
  /** Título, toolbar de vista/búsqueda y acciones del módulo. */
  header: ReactNode
  /** Aviso de éxito u otro mensaje sobre el encabezado (opcional). */
  feedback?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Cabecera fija y scroll solo en el contenido (tabla, kanban, archivados, etc.).
 * El contenedor padre debe ser `flex min-h-0 flex-1 flex-col` (p. ej. AppShell).
 */
export function ListPageLayout({
  header,
  feedback,
  children,
  className,
}: ListPageLayoutProps) {
  return (
    <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col', className)}>
      <div className="shrink-0 space-y-3 border-b border-border bg-background px-3 py-3 sm:space-y-4 sm:px-6 sm:py-4">
        {feedback}
        {header}
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 pb-8 pt-3 sm:px-6 sm:pb-10 sm:pt-4">
        {children}
      </div>
    </div>
  )
}
