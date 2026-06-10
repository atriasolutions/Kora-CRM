import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { BitacoraListItem } from '@/data/bitacora.mock'
import {
  bitacoraBillableLabel,
  bitacoraBillableVariant,
} from '@/lib/bitacora-display'
import { formatBitacoraHours, formatBitacoraWorkDate } from '@/lib/bitacora-form'
import { getUserDetailPath } from '@/lib/user-routes'

type BitacoraDetailSidebarProps = {
  entry: BitacoraListItem
}

export function BitacoraDetailSidebar({ entry }: BitacoraDetailSidebarProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Solicitud y contexto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Solicitud: </span>
            {entry.solicitudId ? (
              <Link
                to={`/solicitudes/${entry.solicitudId}`}
                className="font-medium text-primary hover:underline"
              >
                {entry.solicitudTitle || entry.solicitudCode || 'Ver solicitud'}
              </Link>
            ) : (
              <span className="font-medium">{entry.solicitudTitle || '—'}</span>
            )}
          </p>
          {entry.solicitudCode ? (
            <p>
              <span className="text-muted-foreground">Código: </span>
              <span className="font-mono font-medium">{entry.solicitudCode}</span>
            </p>
          ) : null}
          <p>
            <span className="text-muted-foreground">Empresa: </span>
            {entry.companyId && entry.companyName?.trim() ? (
              <Link
                to={`/empresas/${entry.companyId}`}
                className="font-medium text-primary hover:underline"
              >
                {entry.companyName.trim()}
              </Link>
            ) : (
              <span className="font-medium">—</span>
            )}
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Registro de tiempo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Fecha: </span>
            <span className="font-medium">{formatBitacoraWorkDate(entry.workDate)}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Horas: </span>
            <span className="font-medium">{formatBitacoraHours(entry.hours)} h</span>
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Facturable: </span>
            <Badge variant={bitacoraBillableVariant(entry.isBillable)}>
              {bitacoraBillableLabel(entry.isBillable)}
            </Badge>
          </p>
          {!entry.isBillable && entry.nonBillableReason?.trim() ? (
            <p className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-amber-900 dark:text-amber-100">
              <span className="font-medium">Motivo: </span>
              {entry.nonBillableReason.trim()}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Asignación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Usuario asignado: </span>
            {entry.assignedUserId ? (
              <Link
                to={getUserDetailPath(entry.assignedUserId)}
                className="font-medium text-primary hover:underline"
              >
                {entry.assignedUserName || 'Ver usuario'}
              </Link>
            ) : (
              <span className="font-medium">{entry.assignedUserName || '—'}</span>
            )}
          </p>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Las horas quedan asociadas a la solicitud y al usuario que realizó el trabajo.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
