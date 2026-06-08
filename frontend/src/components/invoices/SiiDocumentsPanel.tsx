import { Loader2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { listRcvApi, syncRcvApi, type RcvInvoice } from '@/api/sii'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrganizationSettings } from '@/hooks/use-organization-settings'
import { toast } from '@/lib/toast'

function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function SiiDocumentsPanel() {
  const { settings } = useOrganizationSettings()
  const [period, setPeriod] = useState(currentPeriod)
  const [issueType, setIssueType] = useState<'issued' | 'received'>('issued')
  const [rows, setRows] = useState<RcvInvoice[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listRcvApi({ period, type: issueType })
      setRows(data)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [issueType, period])

  useEffect(() => {
    if (settings.invoicingMode === 'sii') void load()
  }, [load, settings.invoicingMode])

  if (settings.invoicingMode !== 'sii') return null

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await syncRcvApi({ period, type: issueType })
      toast.success(`Sincronizados ${result.synced} documentos del SII.`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al sincronizar RCV.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base font-semibold">Documentos SII (RCV)</CardTitle>
          <CardDescription>
            Compras y ventas registradas en el Servicio de Impuestos Internos.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
          <select
            value={issueType}
            onChange={(e) => setIssueType(e.target.value as 'issued' | 'received')}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="issued">Ventas emitidas</option>
            <option value="received">Compras recibidas</option>
          </select>
          <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : 'Actualizar'}
          </Button>
          <Button type="button" size="sm" onClick={() => void handleSync()} disabled={syncing}>
            <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden />
            Sincronizar SII
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin documentos para este período. Sincroniza desde el SII.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-3">Folio</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Contraparte</th>
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono">{row.folio ?? '—'}</td>
                    <td className="py-2 pr-3">{row.dteType ?? '—'}</td>
                    <td className="py-2 pr-3">
                      {issueType === 'issued'
                        ? row.receiverName ?? row.receiverRut
                        : row.issuerName ?? row.issuerRut}
                    </td>
                    <td className="py-2 pr-3">{row.issueDate ?? '—'}</td>
                    <td className="py-2 pr-3 text-right">
                      {row.totalAmount != null
                        ? row.totalAmount.toLocaleString('es-CL')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
