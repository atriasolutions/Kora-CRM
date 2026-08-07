import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { useMemo, useState } from 'react'

import type { ArchivedBoletaEntry } from '@/contexts/boletas-registry-context'
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
import { useBoletasRegistry } from '@/hooks/use-boletas-registry'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import {
  BOLETA_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
} from '@/lib/boleta-archive'
import { boletaListStatusLabel, boletaStatusVariant } from '@/lib/boleta-display'
import { cn } from '@/lib/utils'

type BoletasArchivedViewProps = {
  query: string
}

type ConfirmAction =
  | { type: 'restore'; ids: string[] }
  | { type: 'delete'; ids: string[] }

function matchesQuery(entry: ArchivedBoletaEntry, q: string): boolean {
  if (!q) return true
  const { boleta } = entry
  return (
    boleta.number.toLowerCase().includes(q) ||
    boleta.buyerName.toLowerCase().includes(q) ||
    boleta.owner.toLowerCase().includes(q)
  )
}

export function BoletasArchivedView({ query }: BoletasArchivedViewProps) {
  const {
    archivedBoletas,
    restoreBoleta,
    restoreBoletas,
    permanentlyDeleteBoleta,
    permanentlyDeleteBoletas,
  } = useBoletasRegistry()
  const { canDelete: canManageArchive } = useModulePermissions('boletas')

  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () => archivedBoletas.filter((e) => matchesQuery(e, q)),
    [archivedBoletas, q],
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
        if (count === 1) await restoreBoleta(confirm.ids[0]!)
        else await restoreBoletas(confirm.ids)
        toast.success(
          count === 1
            ? 'Boleta restaurada correctamente.'
            : `${count} boletas restauradas.`,
        )
      } else {
        if (count === 1) await permanentlyDeleteBoleta(confirm.ids[0]!)
        else await permanentlyDeleteBoletas(confirm.ids)
        toast.success(
          count === 1
            ? 'Boleta eliminada definitivamente.'
            : `${count} boletas eliminadas definitivamente.`,
        )
      }
      setSelected(new Set())
      setConfirm(null)
    } catch (error) {
      toast.error(
        apiActionErrorMessage(
          error,
          confirm.type === 'restore'
            ? 'No se pudo restaurar la boleta.'
            : 'No se pudo eliminar la boleta.',
        ),
      )
    }
  }

  return (
    <div className="space-y-4">
      {canManageArchive && filtered.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={(e) => toggleAllVisible(e.target.checked)}
            />
            Seleccionar visibles
          </label>
          {selected.size > 0 ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setConfirm({ type: 'restore', ids: [...selected] })}
              >
                <RotateCcw aria-hidden className="me-1 size-4" />
                Restaurar ({selected.size})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => setConfirm({ type: 'delete', ids: [...selected] })}
              >
                <Trash2 aria-hidden className="me-1 size-4" />
                Eliminar ({selected.size})
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {filtered.map((entry) => {
          const { boleta } = entry
          const daysLeft = daysUntilPurge(entry.archivedAt)
          return (
            <li
              key={entry.id}
              className={cn(
                'flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between',
                selected.has(entry.id) && 'bg-muted/30',
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                {canManageArchive ? (
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.has(entry.id)}
                    onChange={(e) => toggleOne(entry.id, e.target.checked)}
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="font-medium">{boleta.number}</p>
                  <p className="text-sm text-muted-foreground">{boleta.buyerName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Archivada {formatArchivedAt(entry.archivedAt)} ·{' '}
                    {formatArchivePurgeLabel(daysLeft)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Badge variant={boletaStatusVariant(boleta.status)}>
                  {boletaListStatusLabel(boleta)}
                </Badge>
                <span className="font-medium tabular-nums">{boleta.amount}</span>
                {canManageArchive ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirm({ type: 'restore', ids: [entry.id] })}
                    >
                      Restaurar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirm({ type: 'delete', ids: [entry.id] })}
                    >
                      Eliminar
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          )
        })}
        {filtered.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">
            No hay boletas archivadas.
          </li>
        ) : null}
      </ul>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
        Los registros archivados se eliminan automáticamente después de{' '}
        {BOLETA_ARCHIVE_RETENTION_DAYS} días.
      </p>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirm?.type === 'restore' ? 'Restaurar boleta' : 'Eliminar definitivamente'}
            </DialogTitle>
            <DialogDescription>
              {confirm?.type === 'restore'
                ? `Se restaurará${confirm.ids.length === 1 ? '' : 'n'} ${confirm.ids.length} boleta${confirm.ids.length === 1 ? '' : 's'} a la lista activa.`
                : `Se eliminará${confirm?.ids.length === 1 ? '' : 'n'} ${confirm?.ids.length ?? 0} boleta${confirm?.ids.length === 1 ? '' : 's'} de forma permanente. Esta acción no se puede deshacer.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant={confirm?.type === 'restore' ? 'default' : 'destructive'}
              onClick={handleConfirm}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
