import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { useMemo, useState } from 'react'

import type { ArchivedStockReceiptEntry } from '@/contexts/stock-receipts-registry-context'
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
import { useStockReceiptsRegistry } from '@/hooks/use-stock-receipts-registry'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import {
  STOCK_RECEIPT_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
} from '@/lib/stock-receipt-archive'
import {
  annulStockReceiptsCopy,
  annulSuccessToast,
} from '@/lib/stock-receipt-lifecycle-messages'
import { cn } from '@/lib/utils'

type StockReceiptsArchivedViewProps = {
  query: string
}

type ConfirmAction =
  | { type: 'restore'; ids: string[] }
  | { type: 'delete'; ids: string[] }

function matchesQuery(entry: ArchivedStockReceiptEntry, q: string): boolean {
  if (!q) return true
  const { receipt } = entry
  return (
    receipt.number.toLowerCase().includes(q) ||
    receipt.externalReference.toLowerCase().includes(q) ||
    (receipt.supplier ?? '').toLowerCase().includes(q) ||
    receipt.owner.toLowerCase().includes(q)
  )
}

export function StockReceiptsArchivedView({ query }: StockReceiptsArchivedViewProps) {
  const {
    archivedReceipts,
    restoreReceipt,
    restoreReceipts,
    permanentlyDeleteReceipt,
    permanentlyDeleteReceipts,
  } = useStockReceiptsRegistry()
  const { canDelete: canManageArchive } = useModulePermissions('ingresos')

  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () => archivedReceipts.filter((e) => matchesQuery(e, q)),
    [archivedReceipts, q],
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

  const receiptsForConfirm = useMemo(() => {
    if (!confirm || confirm.type !== 'delete') return []
    const idSet = new Set(confirm.ids)
    return archivedReceipts
      .filter((e) => idSet.has(e.id))
      .map((e) => e.receipt)
  }, [archivedReceipts, confirm])

  const annulCopy = useMemo(
    () =>
      receiptsForConfirm.length > 0
        ? annulStockReceiptsCopy(receiptsForConfirm)
        : null,
    [receiptsForConfirm],
  )

  const handleConfirm = async () => {
    if (!confirm) return
    const count = confirm.ids.length
    try {
      if (confirm.type === 'restore') {
        if (count === 1) await restoreReceipt(confirm.ids[0]!)
        else await restoreReceipts(confirm.ids)
        toast.success(
          count === 1
            ? 'Ingreso restaurado correctamente.'
            : `${count} ingresos restaurados.`,
        )
      } else {
        if (count === 1) await permanentlyDeleteReceipt(confirm.ids[0]!)
        else await permanentlyDeleteReceipts(confirm.ids)
        toast.success(annulSuccessToast(receiptsForConfirm))
      }
      setSelected(new Set())
      setConfirm(null)
    } catch (error) {
      toast.error(apiActionErrorMessage(error))
    }
  }

  const selectedIds = [...selected]
  const selectedHasConfirmed = useMemo(
    () =>
      archivedReceipts.some(
        (e) => selected.has(e.id) && e.receipt.status === 'Confirmado',
      ),
    [archivedReceipts, selected],
  )

  return (
    <div className="space-y-4">
      <div
        className="flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100"
        role="note"
      >
        <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Papelera de ingresos</p>
          <p className="text-amber-900/90 dark:text-amber-100/90">
            <strong>Archivar</strong> solo oculta el documento: si estaba confirmado, el stock en
            bodega no cambia. <strong>Anular</strong> (eliminar definitivamente un confirmado)
            revierte el stock y devuelve cantidades como pendientes en la OC. Los registros se
            conservan aquí <strong>{STOCK_RECEIPT_ARCHIVE_RETENTION_DAYS} días</strong> antes del
            borrado automático.
          </p>
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-foreground">
            {selected.size} seleccionado{selected.size === 1 ? '' : 's'}
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
                {selectedHasConfirmed ? 'Anular ingreso(s)' : 'Eliminar definitivamente'}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
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
                    aria-label="Seleccionar todos"
                    checked={allVisibleSelected}
                    className="size-4 accent-primary"
                    type="checkbox"
                    onChange={(e) => toggleAllVisible(e.target.checked)}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Ingreso</th>
                <th className="px-4 py-3 font-semibold">Archivado</th>
                <th className="px-4 py-3 font-semibold">Eliminación</th>
                <th className="w-[200px] px-4 py-3 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center text-muted-foreground" colSpan={5}>
                    {archivedReceipts.length === 0
                      ? 'No hay ingresos en la papelera.'
                      : 'Ningún resultado coincide con la búsqueda.'}
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => {
                  const { receipt } = entry
                  const urgent = daysUntilPurge(entry.archivedAt) <= 3
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3">
                        <input
                          aria-label={`Seleccionar ${receipt.number}`}
                          checked={selected.has(entry.id)}
                          className="size-4 accent-primary"
                          type="checkbox"
                          onChange={(e) => toggleOne(entry.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{receipt.number}</p>
                        <p className="text-xs text-muted-foreground">
                          {receipt.warehouse} · {receipt.status}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatArchivedAt(entry.archivedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'text-sm',
                            urgent ? 'font-medium text-destructive' : 'text-muted-foreground',
                          )}
                        >
                          {formatArchivePurgeLabel(entry.archivedAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          {canManageArchive ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirm({ type: 'restore', ids: [entry.id] })}
                            >
                              Restaurar
                            </Button>
                          ) : null}
                          {canManageArchive ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => setConfirm({ type: 'delete', ids: [entry.id] })}
                            >
                              {receipt.status === 'Confirmado' ? 'Anular' : 'Eliminar'}
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

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm?.type === 'restore'
                ? confirm.ids.length === 1
                  ? 'Restaurar ingreso'
                  : 'Restaurar ingresos'
                : annulCopy?.title ?? 'Eliminar definitivamente'}
            </DialogTitle>
            <DialogDescription>
              {confirm?.type === 'restore'
                ? `Se restaurarán ${confirm.ids.length} ingreso(s) a la lista activa.`
                : annulCopy?.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant={confirm?.type === 'delete' ? 'destructive' : 'default'}
              onClick={handleConfirm}
            >
              {confirm?.type === 'restore'
                ? 'Restaurar'
                : annulCopy?.confirmLabel ?? 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
