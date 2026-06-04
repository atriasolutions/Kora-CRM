import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { useMemo, useState } from 'react'

import type { ArchivedOpportunityEntry } from '@/contexts/opportunities-registry-context'
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
import { useOpportunitiesRegistry } from '@/hooks/use-opportunities-registry'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import {
  OPPORTUNITY_ARCHIVE_RETENTION_DAYS,
  daysUntilPurge,
  formatArchivePurgeLabel,
  formatArchivedAt,
} from '@/lib/opportunity-archive'
import { cn } from '@/lib/utils'

type OpportunitiesArchivedViewProps = {
  query: string
}

type ConfirmAction =
  | { type: 'restore'; ids: string[] }
  | { type: 'delete'; ids: string[] }

function matchesQuery(entry: ArchivedOpportunityEntry, q: string): boolean {
  if (!q) return true
  const { opportunity } = entry
  return (
    opportunity.name.toLowerCase().includes(q) ||
    opportunity.company.toLowerCase().includes(q) ||
    opportunity.contactName.toLowerCase().includes(q) ||
    opportunity.owner.toLowerCase().includes(q) ||
    opportunity.stage.toLowerCase().includes(q)
  )
}

export function OpportunitiesArchivedView({ query }: OpportunitiesArchivedViewProps) {
  const {
    archivedOpportunities,
    restoreOpportunity,
    restoreOpportunities,
    permanentlyDeleteOpportunity,
    permanentlyDeleteOpportunities,
  } = useOpportunitiesRegistry()
  const { canDelete: canManageArchive } = useModulePermissions('oportunidades')

  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () => archivedOpportunities.filter((e) => matchesQuery(e, q)),
    [archivedOpportunities, q],
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
        if (count === 1) await restoreOpportunity(confirm.ids[0]!)
        else await restoreOpportunities(confirm.ids)
        toast.success(
          count === 1
            ? 'Oportunidad restaurada correctamente.'
            : `${count} oportunidades restauradas.`,
        )
      } else {
        if (count === 1) await permanentlyDeleteOpportunity(confirm.ids[0]!)
        else await permanentlyDeleteOpportunities(confirm.ids)
        toast.success(
          count === 1
            ? 'Oportunidad eliminada definitivamente.'
            : `${count} oportunidades eliminadas definitivamente.`,
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
            Las oportunidades archivadas permanecen aquí durante{' '}
            <strong>{OPPORTUNITY_ARCHIVE_RETENTION_DAYS} días</strong>. Después se eliminan
            de forma definitiva y no podrás recuperarlas. Restaura las que aún necesites
            o elimínalas manualmente antes de esa fecha.
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
                className="border-border bg-card shadow-sm"
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
                <th className="px-4 py-3 font-semibold text-foreground">Oportunidad</th>
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
                  <td
                    className="px-4 py-12 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    {archivedOpportunities.length === 0
                      ? 'No hay oportunidades en la papelera.'
                      : 'Ningún resultado coincide con la búsqueda.'}
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => {
                  const { opportunity } = entry
                  const urgent = daysUntilPurge(entry.archivedAt) <= 3
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3">
                        <input
                          aria-label={`Seleccionar ${opportunity.name}`}
                          checked={selected.has(entry.id)}
                          className="size-4 accent-primary"
                          type="checkbox"
                          onChange={(e) => toggleOne(entry.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">
                              {opportunity.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {opportunity.company} · {opportunity.amount}
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {opportunity.stage}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatArchivedAt(entry.archivedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'text-sm',
                            urgent
                              ? 'font-medium text-destructive'
                              : 'text-muted-foreground',
                          )}
                        >
                          {formatArchivePurgeLabel(entry.archivedAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {canManageArchive ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setConfirm({ type: 'restore', ids: [entry.id] })
                              }
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
                              onClick={() =>
                                setConfirm({ type: 'delete', ids: [entry.id] })
                              }
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

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirm?.type === 'restore'
                ? confirm.ids.length === 1
                  ? 'Restaurar oportunidad'
                  : `Restaurar ${confirm.ids.length} oportunidades`
                : confirm?.ids.length === 1
                  ? 'Eliminar definitivamente'
                  : `Eliminar ${confirm?.ids.length} oportunidades`}
            </DialogTitle>
            <DialogDescription>
              {confirm?.type === 'restore'
                ? 'La oportunidad volverá a aparecer en tus listados activos.'
                : 'Esta acción no se puede deshacer. Se borrarán los datos guardados localmente de esta oportunidad.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant={confirm?.type === 'delete' ? 'destructive' : 'default'}
              onClick={handleConfirm}
            >
              {confirm?.type === 'restore' ? 'Restaurar' : 'Eliminar definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
