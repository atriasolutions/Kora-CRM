import { ArrowLeft, Link2Off, RefreshCw, ShieldOff, WifiOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  RECORD_MODULE_META,
  recordUnavailableMessage,
  type RecordModuleKey,
  type RecordUnavailableReason,
} from '@/lib/record-module-meta'

type RecordUnavailableViewProps = {
  module: RecordModuleKey
  reason?: RecordUnavailableReason | null
  /** Mensaje del API (p. ej. permiso denegado). */
  detail?: string
  recordId?: string
  listPath?: string
  listLabel?: string
  /** Reintentar carga (p. ej. tras error de conexión). */
  onRetry?: () => void
}

export function RecordUnavailableView({
  module,
  reason = 'not_found',
  detail,
  recordId,
  listPath,
  listLabel,
  onRetry,
}: RecordUnavailableViewProps) {
  const navigate = useNavigate()
  const meta = RECORD_MODULE_META[module]
  const resolvedReason = reason ?? 'not_found'
  const copy = recordUnavailableMessage(module, resolvedReason, { detail })
  const Icon =
    resolvedReason === 'forbidden'
      ? ShieldOff
      : resolvedReason === 'connection_error'
        ? WifiOff
        : Link2Off
  const backPath = listPath ?? meta.listPath
  const backLabel = listLabel ?? meta.listLabel

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-lg border-dashed shadow-sm">
        <CardContent className="flex flex-col items-center gap-5 px-6 py-10 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon aria-hidden className="size-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {copy.title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
            {recordId ? (
              <p className="font-mono text-xs text-muted-foreground/80">ID: {recordId}</p>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            {onRetry && resolvedReason === 'connection_error' ? (
              <Button type="button" className="w-full sm:w-auto" onClick={onRetry}>
                <RefreshCw aria-hidden className="size-4" />
                Reintentar
              </Button>
            ) : null}
            <Button variant="default" className="w-full sm:w-auto" asChild>
              <Link to={backPath}>Ir a {backLabel}</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft aria-hidden className="size-4" />
              Volver atrás
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
