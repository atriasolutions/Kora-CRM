import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from '@/lib/toast'

import type { ArchivedPruebaEntry } from '@/contexts/pruebas-solicitud-registry-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiActionErrorMessage } from '@/api/errors'
import { usePruebasSolicitudRegistry } from '@/hooks/use-pruebas-solicitud-registry'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { formatPruebaClientProgress } from '@/lib/prueba-solicitud-form'
import {
  PRUEBA_SOLICITUD_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
} from '@/lib/prueba-solicitud-archive'
import { cn } from '@/lib/utils'

type PruebasSolicitudArchivedViewProps = {
  query: string
}

type ConfirmAction =
  | { type: 'restore'; ids: string[] }
  | { type: 'delete'; ids: string[] }

function matchesQuery(entry: ArchivedPruebaEntry, q: string): boolean {
  if (!q) return true
  const row = entry.snapshot
  if (!row) return false
  return (
    row.code.toLowerCase().includes(q) ||
    row.solicitudCode.toLowerCase().includes(q) ||
    row.solicitudTitle.toLowerCase().includes(q) ||
    row.description.toLowerCase().includes(q) ||
    row.companyName?.toLowerCase().includes(q)
  )
}

export function PruebasSolicitudArchivedView({ query }: PruebasSolicitudArchivedViewProps) {
  const {
    archivedPruebas,
    restorePrueba,
    restorePruebas,
    permanentlyDeletePrueba,
    permanentlyDeletePruebas,
  } = usePruebasSolicitudRegistry()
  const { canDelete: canManageArchive } = useModulePermissions('pruebas_solicitud')

  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () => archivedPruebas.filter((e) => matchesQuery(e, q)),
    [archivedPruebas, q],
  )

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((e) => selected.has(e.id))

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleAllVisible = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      filtered.forEach((e) => {
        if (checked) next.add(e.id)
        else next.delete(e.id)
      })
      return next
    })
  }

  const handleConfirm = async () => {
    if (!confirm) return
    const count = confirm.ids.length
    try {
      if (confirm.type === 'restore') {
        if (count === 1) await restorePrueba(confirm.ids[0]!)
        else await restorePruebas(confirm.ids)
        toast.success(
          count === 1 ? 'Prueba restaurada correctamente.' : `${count} pruebas restauradas.`,
        )
      } else {
        if (count === 1) await permanentlyDeletePrueba(confirm.ids[0]!)
        else await permanentlyDeletePruebas(confirm.ids)
        toast.success(
          count === 1
            ? 'Prueba eliminada definitivamente.'
            : `${count} pruebas eliminadas definitivamente.`,
        )
      }
      setSelected(new Set())
      setConfirm(null)
    } catch (error) {
      toast.error(apiActionErrorMessage(error))
    }
  }

  const selectedIds = [...selected]

  return (
    <div className="space-y-4">
      <div
        className="flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100"
        role="note"
      >
        <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Papelera de reciclaje</p>
          <p className="text-amber-900/90 dark:text-amber-100/90">
            Las pruebas archivadas permanecen aquí durante{' '}
            <strong>{PRUEBA_SOLICITUD_ARCHIVE_RETENTION_DAYS} días</strong>. Después se eliminan
            de forma definitiva.
          </p>
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-foreground">
            {selected.size} seleccionada{selected.size === 1 ? '' : 's'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {canManageArchive ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setConfirm({ type: 'restore', ids: selectedIds })}
              >
                <RotateCcw aria-hidden className="size-4" />
                Restaurar
              </Button>
            ) : null}
            {canManageArchive ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => setConfirm({ type: 'delete', ids: selectedIds })}
              >
                <Trash2 aria-hidden className="size-4" />
                Eliminar definitivamente
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setSelected(new Set())}
            >
              Cancelar selección
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                <th className="w-11 px-4 py-3">
                  <input
                    aria-label="Seleccionar todas"
                    checked={allVisibleSelected}
                    className="size-4 accent-primary"
                    type="checkbox"
                    onChange={(e) => toggleAllVisible(e.target.checked)}
                  />
                </th>
                <th className="px-4 py-3 font-semibold text-foreground">Prueba</th>
                <th className="px-4 py-3 font-semibold text-foreground">Archivada</th>
                <th className="px-4 py-3 font-semibold text-foreground">Eliminación</th>
                <th className="w-[200px] px-4 py-3 text-center font-semibold text-foreground">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center text-muted-foreground" colSpan={5}>
                    {archivedPruebas.length === 0
                      ? 'No hay pruebas en la papelera.'
                      : 'Ningún resultado coincide con la búsqueda.'}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const row = item.snapshot
                  const urgent = daysUntilPurge(item.archivedAt) <= 3
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3">
                        <input
                          aria-label={`Seleccionar ${row?.code ?? item.id}`}
                          checked={selected.has(item.id)}
                          className="size-4 accent-primary"
                          type="checkbox"
                          onChange={(e) => toggleOne(item.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {row?.code ?? item.id}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row
                              ? `${row.solicitudCode} · ${row.solicitudTitle}`
                              : 'Sin datos de respaldo'}
                          </p>
                          {row ? (
                            <Badge variant="outline" className="mt-1">
                              {formatPruebaClientProgress(row.clientOkCount, row.caseCount)}
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatArchivedAt(item.archivedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'text-sm',
                            urgent ? 'font-medium text-destructive' : 'text-muted-foreground',
                          )}
                        >
                          {formatArchivePurgeLabel(item.archivedAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {canManageArchive ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirm({ type: 'restore', ids: [item.id] })}
                            >
                              Restaurar
                            </Button>
                          ) : null}
                          {canManageArchive ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setConfirm({ type: 'delete', ids: [item.id] })}
                            >
                              Eliminar
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={confirm != null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirm?.type === 'restore' ? 'Restaurar prueba' : 'Eliminar definitivamente'}
            </DialogTitle>
            <DialogDescription>
              {confirm?.type === 'restore'
                ? `Se restaurará${confirm.ids.length === 1 ? ' la prueba seleccionada' : `n ${confirm.ids.length} pruebas`} a la lista activa.`
                : `Se eliminará${confirm?.ids.length === 1 ? ' la prueba seleccionada' : `n ${confirm?.ids.length ?? 0} pruebas`} de forma permanente. Esta acción no se puede deshacer.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant={confirm?.type === 'delete' ? 'destructive' : 'default'}
              onClick={() => void handleConfirm()}
            >
              {confirm?.type === 'restore' ? 'Restaurar' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
