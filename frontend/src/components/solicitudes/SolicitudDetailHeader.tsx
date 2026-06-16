import type { ReactNode } from 'react'
import {
  Building2,
  ClipboardList,
  Hash,
  Pencil,
  Trash2,
  UserRound,
  Users,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  DetailMetricsGrid,
  DetailRecordHeaderShell,
  detailRecordTitleClassName,
} from '@/components/shared/DetailRecordHeaderShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SolicitudDetail } from '@/data/solicitudes.mock'
import {
  solicitudPriorityVariant,
  solicitudStatusVariant,
} from '@/lib/solicitud-display'
import { getUserDetailPath } from '@/lib/user-routes'
import { cn } from '@/lib/utils'

type SolicitudDetailHeaderProps = {
  solicitud: SolicitudDetail
  canEdit?: boolean
  canDelete?: boolean
  canRegisterActivity?: boolean
  onStartEdit?: () => void
  onRegisterActivity?: () => void
  onArchive?: () => void
}

function SummaryLink({
  to,
  children,
  className,
}: {
  to: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5 break-words font-semibold text-primary hover:underline',
        className,
      )}
    >
      {children}
    </Link>
  )
}

export function SolicitudDetailHeader({
  solicitud,
  canEdit = false,
  canDelete = false,
  canRegisterActivity = false,
  onStartEdit,
  onRegisterActivity,
  onArchive,
}: SolicitudDetailHeaderProps) {
  const requesterName = solicitud.createdByName?.trim() || '—'
  const companyName = solicitud.companyName?.trim() || '—'
  const assigneeName = solicitud.assignee?.trim() || '—'

  const metrics = [
    {
      label: 'Solicitante',
      value: requesterName,
      icon: UserRound,
      link: solicitud.createdById
        ? getUserDetailPath(solicitud.createdById)
        : undefined,
    },
    {
      label: 'Empresa',
      value: companyName,
      icon: Building2,
      link: solicitud.companyId ? `/empresas/${solicitud.companyId}` : undefined,
    },
    {
      label: 'Responsable',
      value: assigneeName,
      icon: Users,
      link: solicitud.assigneeUserId
        ? getUserDetailPath(solicitud.assigneeUserId)
        : undefined,
    },
  ]

  return (
    <DetailRecordHeaderShell
      media={
        <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-gradient-to-br from-primary/10 to-chart-3/10 sm:size-16">
          <ClipboardList aria-hidden className="size-7 text-primary sm:size-8" />
        </div>
      }
      body={
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-3 py-1 font-mono text-base font-bold tracking-wide text-primary sm:text-lg">
              <Hash aria-hidden className="size-4 shrink-0 opacity-80" />
              {solicitud.code?.trim() || '—'}
            </span>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <h1 className={detailRecordTitleClassName()}>{solicitud.title}</h1>
            <Badge variant={solicitudStatusVariant(solicitud.status)} className="shrink-0">
              {solicitud.status}
            </Badge>
            <Badge variant={solicitudPriorityVariant(solicitud.priority)} className="shrink-0">
              {solicitud.priority}
            </Badge>
          </div>
        </>
      }
      actions={
        <>
          {canEdit && onStartEdit ? (
            <Button type="button" size="sm" variant="outline" onClick={onStartEdit}>
              <Pencil aria-hidden className="size-4" />
              Editar
            </Button>
          ) : null}
          {canRegisterActivity && onRegisterActivity ? (
            <Button type="button" size="sm" variant="outline" onClick={onRegisterActivity}>
              <Zap aria-hidden className="size-4" />
              Nueva actividad
            </Button>
          ) : null}
          {canDelete && onArchive ? (
            <Button type="button" size="sm" variant="destructive" onClick={onArchive}>
              <Trash2 aria-hidden className="size-4" />
              Archivar
            </Button>
          ) : null}
        </>
      }
      metrics={
        <DetailMetricsGrid className="md:grid-cols-3 xl:grid-cols-3">
          {metrics.map(({ label, value, icon: Icon, link }) => (
            <div
              key={label}
              className="min-w-0 rounded-lg border border-border bg-muted/20 px-2.5 py-2 sm:px-3"
            >
              <p className="inline-flex items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
                <Icon aria-hidden className="size-3.5 shrink-0" />
                {label}
              </p>
              <p className="mt-0.5 break-words text-sm font-semibold sm:text-base">
                {link && value !== '—' ? (
                  <SummaryLink to={link}>{value}</SummaryLink>
                ) : (
                  value
                )}
              </p>
            </div>
          ))}
        </DetailMetricsGrid>
      }
    />
  )
}
