import { createElement, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'

import type { BitacoraListItem } from '@/data/bitacora.mock'
import { cn } from '@/lib/utils'

type BitacoraSolicitudNameLinkProps = {
  row: BitacoraListItem
  className?: string
  onClick?: (e: MouseEvent) => void
}

export function BitacoraSolicitudNameLink({
  row,
  className,
  onClick,
}: BitacoraSolicitudNameLinkProps) {
  const title = row.solicitudTitle?.trim()
  const code = row.solicitudCode?.trim()

  if (!row.solicitudId?.trim() || !title) {
    return <span className={cn('text-muted-foreground', className)}>{title || code || '—'}</span>
  }

  return (
    <div className={cn('min-w-0', className)}>
      <Link
        to={`/solicitudes/${row.solicitudId}`}
        onClick={onClick}
        className="block truncate font-medium text-primary underline-offset-2 hover:underline"
        title={code ? `${code} · ${title}` : title}
      >
        {title}
      </Link>
      {code ? (
        <p className="truncate text-xs text-muted-foreground">{code}</p>
      ) : null}
    </div>
  )
}

/** Para columnas de listado sin JSX en archivos `.ts` de config. */
export function renderBitacoraSolicitudNameCell(row: BitacoraListItem) {
  return createElement(BitacoraSolicitudNameLink, {
    row,
    onClick: (e: MouseEvent) => e.stopPropagation(),
  })
}
