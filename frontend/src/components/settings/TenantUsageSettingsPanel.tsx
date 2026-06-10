import { Loader2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  formatPercentOfLimit,
  formatStorageBytes,
  getTenantUsageApi,
  MODULE_LABELS,
  quotaLevelLabel,
  type QuotaLevel,
  type TenantUsageDto,
} from '@/api/tenant-quotas'
import { isApiEnabled } from '@/api/config'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function levelVariant(level: QuotaLevel): 'default' | 'secondary' | 'destructive' {
  if (level === 'blocked') return 'destructive'
  if (level === 'warning') return 'secondary'
  return 'default'
}

function UsageBar({
  label,
  used,
  limit,
  level,
  unit,
  gracePercent,
  description,
}: {
  label: string
  used: number
  limit: number | null
  level: QuotaLevel
  unit: 'users' | 'gb'
  gracePercent: number
  description?: string
}) {
  const usedLabel =
    unit === 'users' ? String(used) : formatStorageBytes(used)
  const limitLabel =
    limit == null
      ? 'Sin límite'
      : unit === 'users'
        ? String(limit)
        : formatStorageBytes(limit)
  const pct =
    limit != null && limit > 0
      ? Math.min(100, Math.round((used / limit) * 100))
      : 0

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{label}</CardTitle>
          <Badge variant={levelVariant(level)}>{quotaLevelLabel(level)}</Badge>
        </div>
        <CardDescription>
          {usedLabel} de {limitLabel}
          {limit != null && unit === 'gb'
            ? ` · ${formatPercentOfLimit(used, limit)} del límite (+${gracePercent}% tolerancia antes de bloqueo)`
            : limit != null && unit === 'users'
              ? ` · ${formatPercentOfLimit(used, limit)} del límite`
              : null}
          {description ? (
            <>
              <br />
              {description}
            </>
          ) : null}
        </CardDescription>
      </CardHeader>
      {limit != null ? (
        <CardContent>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                level === 'blocked'
                  ? 'bg-destructive'
                  : level === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-primary',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      ) : null}
    </Card>
  )
}

function ModuleTable({
  title,
  rows,
  limitBytes,
}: {
  title: string
  rows: Array<{ module: string; bytes: number }>
  limitBytes: number | null
}) {
  if (rows.length === 0) return null
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {limitBytes != null ? (
          <CardDescription>
            Porcentaje de cada módulo respecto al límite total (
            {formatStorageBytes(limitBytes)}).
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Módulo</th>
                <th className="pb-2 text-right font-medium">Uso</th>
                <th className="pb-2 text-right font-medium">% del límite</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.module} className="border-b border-border/60 last:border-0">
                  <td className="py-2">{MODULE_LABELS[row.module] ?? row.module}</td>
                  <td className="py-2 text-right tabular-nums">{formatStorageBytes(row.bytes)}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {formatPercentOfLimit(row.bytes, limitBytes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export function TenantUsageSettingsPanel() {
  const [usage, setUsage] = useState<TenantUsageDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (refresh = false) => {
    if (!isApiEnabled()) {
      setLoading(false)
      return
    }
    if (refresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await getTenantUsageApi(refresh)
      setUsage(data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const recordModules = useMemo(() => {
    if (!usage) return []
    return Object.entries(usage.recordsByModule)
      .filter(([, bytes]) => bytes > 0)
      .map(([module, bytes]) => ({ module, bytes }))
      .sort((a, b) => b.bytes - a.bytes)
  }, [usage])

  const fileModules = useMemo(() => {
    if (!usage) return []
    return Object.entries(usage.filesByModule)
      .filter(([, bytes]) => bytes > 0)
      .map(([module, bytes]) => ({ module, bytes }))
      .sort((a, b) => b.bytes - a.bytes)
  }, [usage])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 aria-hidden className="size-4 animate-spin" />
        Calculando uso de la instancia…
      </div>
    )
  }

  if (!usage) {
    return (
      <p className="text-sm text-muted-foreground">
        Conecta la API para ver el uso de la instancia.
      </p>
    )
  }

  const recordsLimit = usage.quotas.maxRecordsBytes
  const filesLimit = usage.quotas.maxFilesBytes
  const hasRecordsLimit = recordsLimit != null && recordsLimit > 0
  const hasFilesLimit = filesLimit != null && filesLimit > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Actualizado:{' '}
          {new Date(usage.computedAt).toLocaleString('es-CL', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={refreshing}
          onClick={() => void load(true)}
        >
          {refreshing ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <RefreshCw aria-hidden className="size-4" />
          )}
          Recalcular
        </Button>
      </div>

      <UsageBar
        label="Usuarios internos (Activo + Por verificar)"
        used={usage.seatsUsed}
        limit={usage.quotas.maxActiveUsers}
        level={usage.seatsLevel}
        unit="users"
        gracePercent={usage.quotas.gracePercent}
        description="No incluye usuarios con perfil Invitado; esos tienen cupo aparte."
      />
      <UsageBar
        label="Usuarios con perfil Invitado"
        used={usage.guestUsersUsed}
        limit={usage.maxGuestUsers}
        level={usage.guestUsersLevel}
        unit="users"
        gracePercent={0}
        description={
          usage.maxGuestUsers != null && usage.quotas.maxActiveUsers != null
            ? `Límite derivado: ${usage.quotas.maxActiveUsers} usuarios activos × 10. Los invitados inactivos no cuentan en el cupo.`
            : usage.maxGuestUsers == null
              ? 'Define el cupo de usuarios activos para calcular el límite de Invitados (×10).'
              : 'Los invitados inactivos no cuentan en el cupo.'
        }
      />
      <UsageBar
        label="Almacenamiento de registros"
        used={usage.recordsBytes}
        limit={recordsLimit}
        level={usage.recordsLevel}
        unit="gb"
        gracePercent={usage.quotas.gracePercent}
      />
      <UsageBar
        label="Almacenamiento de archivos"
        used={usage.filesBytes}
        limit={filesLimit}
        level={usage.filesLevel}
        unit="gb"
        gracePercent={usage.quotas.gracePercent}
      />

      {!hasRecordsLimit && !hasFilesLimit ? (
        <p className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
          Esta instancia aún no tiene límites de almacenamiento configurados. Los porcentajes por
          módulo aparecerán cuando el operador de plataforma defina los cupos en{' '}
          <strong>Instancia</strong>.
        </p>
      ) : null}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Si superas el límite contratado puedes seguir operando hasta un{' '}
        {usage.quotas.gracePercent}% adicional; al superar esa tolerancia no se podrán crear
        registros ni subir archivos hasta liberar espacio o ajustar el plan.
      </p>

      <ModuleTable
        title="Registros por módulo"
        rows={recordModules}
        limitBytes={recordsLimit}
      />
      <ModuleTable title="Archivos por módulo" rows={fileModules} limitBytes={filesLimit} />
    </div>
  )
}
