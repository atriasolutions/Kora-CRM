import {
  Building2,
  Calendar,
  Clock,
  ClipboardList,
  Link2,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { BitacoraListItem } from '@/data/bitacora.mock'
import {
  bitacoraBillableLabel,
  bitacoraBillableVariant,
} from '@/lib/bitacora-display'
import { formatBitacoraHours, formatBitacoraWorkDate } from '@/lib/bitacora-form'
import { useDetailHeaderPermissions } from '@/hooks/use-detail-header-permissions'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { getUserDetailPath } from '@/lib/user-routes'
type BitacoraDetailHeaderProps = {
  entry: BitacoraListItem
  onStartEdit?: () => void
  onDelete?: () => void
}

export function BitacoraDetailHeader({
  entry,
  onStartEdit,
  onDelete,
}: BitacoraDetailHeaderProps) {
  const { showEdit } = useDetailHeaderPermissions('bitacora', { onStartEdit })
  const { canDelete } = useModulePermissions('bitacora')
  const showDelete = canDelete && Boolean(onDelete)

  const hoursLabel = `${formatBitacoraHours(entry.hours)} h`
  const workDateLabel = formatBitacoraWorkDate(entry.workDate)
  const companyLabel = entry.companyName?.trim() || '—'

  const metrics = [
    { label: 'Horas', value: hoursLabel },
    { label: 'Fecha', value: workDateLabel },
    { label: 'Usuario', value: entry.assignedUserName || '—' },
    { label: 'Empresa', value: companyLabel },
    { label: 'Facturable', value: entry.isBillable ? 'Sí' : 'No' },
    { label: 'Solicitud', value: entry.solicitudCode || '—' },
  ]

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-br from-muted/40 via-card to-card p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-gradient-to-br from-primary/10 to-chart-3/10 sm:size-16">
              <Clock aria-hidden className="size-7 text-primary sm:size-8" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">
                  {entry.solicitudTitle?.trim() || 'Registro de bitácora'}
                </h1>
                <Badge variant={bitacoraBillableVariant(entry.isBillable)}>
                  {bitacoraBillableLabel(entry.isBillable)}
                </Badge>
                <Badge variant="outline">{hoursLabel}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {entry.assignedUserName || '—'} · {workDateLabel}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {entry.solicitudId ? (
                  <Link
                    to={`/solicitudes/${entry.solicitudId}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ClipboardList aria-hidden className="size-4" />
                    {entry.solicitudCode || 'Ver solicitud'}
                  </Link>
                ) : null}
                {entry.companyId && entry.companyName?.trim() ? (
                  <Link
                    to={`/empresas/${entry.companyId}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Building2 aria-hidden className="size-4" />
                    {entry.companyName.trim()}
                  </Link>
                ) : null}
                {entry.assignedUserId ? (
                  <Link
                    to={getUserDetailPath(entry.assignedUserId)}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <UserRound aria-hidden className="size-4" />
                    {entry.assignedUserName || 'Ver usuario'}
                  </Link>
                ) : null}
                {entry.description?.trim() ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Link2 aria-hidden className="size-4" />
                    {entry.description.trim().slice(0, 80)}
                    {entry.description.trim().length > 80 ? '…' : ''}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/60 pt-4 2xl:w-auto 2xl:shrink-0 2xl:border-t-0 2xl:pt-0">
            {showEdit ? (
              <Button
                variant="outline"
                size="sm"
                className="border-border shadow-sm"
                onClick={onStartEdit}
              >
                <Pencil aria-hidden className="size-4" />
                Editar
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="border-border shadow-sm">
                  <MoreHorizontal aria-hidden className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {entry.solicitudId ? (
                  <DropdownMenuItem asChild>
                    <Link to={`/solicitudes/${entry.solicitudId}`}>Ver solicitud</Link>
                  </DropdownMenuItem>
                ) : null}
                {showDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={onDelete}
                    >
                      <Trash2 aria-hidden className="size-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map(({ label, value }) => (
            <div
              key={label}
              className="rounded-lg border border-border bg-muted/20 px-2.5 py-2 sm:px-3"
            >
              <p className="text-[10px] text-muted-foreground sm:text-xs">{label}</p>
              <p className="mt-0.5 truncate text-sm font-semibold sm:text-base">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar aria-hidden className="size-4" />
            Fecha de trabajo: {workDateLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock aria-hidden className="size-4" />
            {hoursLabel} registradas
          </span>
        </div>
      </div>
    </section>
  )
}
