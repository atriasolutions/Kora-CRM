import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { RegionCommuneFields } from '@/components/shared/RegionCommuneFields'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useCatalogSettings } from '@/hooks/use-catalog-settings'
import {
  validateWarehouseLocation,
  validateWarehouseName,
} from '@/lib/catalog-settings'
import { warehouseHasCompleteLocation } from '@/lib/warehouse-lookup'
import type { WarehouseSetting } from '@/types/catalog-settings'
import { cn } from '@/lib/utils'

type WarehouseDraft = {
  name: string
  code: string
  address: string
  region: string
  commune: string
}

function draftFromWarehouse(warehouse: WarehouseSetting): WarehouseDraft {
  return {
    name: warehouse.name,
    code: warehouse.code,
    address: warehouse.address ?? '',
    region: warehouse.region ?? '',
    commune: warehouse.commune ?? '',
  }
}

function draftsMatch(warehouse: WarehouseSetting, draft: WarehouseDraft): boolean {
  const base = draftFromWarehouse(warehouse)
  return (
    base.name === draft.name &&
    base.code === draft.code &&
    base.address === draft.address &&
    base.region === draft.region &&
    base.commune === draft.commune
  )
}

export function WarehousesSettingsPanel() {
  const { canCreate, canEdit, canDelete } = useModulePermissions('configuracion')
  const {
    catalog,
    isLoading,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    setDefaultWarehouse,
  } = useCatalogSettings()
  const [newName, setNewName] = useState('')
  const [drafts, setDrafts] = useState<Record<string, WarehouseDraft>>({})

  const warehouses = catalog.warehouses

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev }
      for (const w of warehouses) {
        if (!next[w.id]) {
          next[w.id] = draftFromWarehouse(w)
        }
      }
      return next
    })
  }, [warehouses])

  const run = async (fn: () => Promise<void>, success?: string) => {
    try {
      await fn()
      if (success) toast.success(success)
    } catch (err) {
      toast.warning(err instanceof Error ? err.message : 'No se pudo guardar la bodega.')
    }
  }

  const handleAdd = () => {
    const validation = validateWarehouseName(warehouses, newName)
    if (validation) {
      toast.warning(validation)
      return
    }
    void run(async () => {
      const created = await createWarehouse(newName)
      setNewName('')
      setDrafts((prev) => ({
        ...prev,
        [created.id]: draftFromWarehouse(created),
      }))
      toast.success(`Bodega «${created.name}» agregada.`)
    })
  }

  const handleRemove = (id: string) => {
    const target = warehouses.find((w) => w.id === id)
    if (!target) return
    if (warehouses.length <= 1) {
      toast.warning('Debe existir al menos una bodega.')
      return
    }
    void run(
      () => deleteWarehouse(id),
      `Bodega «${target.name}» eliminada.`,
    )
  }

  const saveWarehouse = (warehouse: WarehouseSetting) => {
    const draft = drafts[warehouse.id] ?? draftFromWarehouse(warehouse)
    const nameErr = validateWarehouseName(warehouses, draft.name, warehouse.id)
    if (nameErr) {
      toast.warning(nameErr)
      return
    }
    const merged: WarehouseSetting = { ...warehouse, ...draft, name: draft.name.trim() }
    const locationErr = validateWarehouseLocation(merged)
    if (locationErr) {
      toast.warning(locationErr)
      return
    }
    void run(
      async () => {
        const updated = await updateWarehouse(warehouse.id, {
          name: draft.name.trim(),
          code: draft.code.trim(),
          address: draft.address.trim(),
          region: draft.region.trim(),
          commune: draft.commune.trim(),
        })
        setDrafts((prev) => ({
          ...prev,
          [warehouse.id]: draftFromWarehouse(updated),
        }))
      },
      `Bodega «${draft.name.trim()}» guardada.`,
    )
  }

  const patchDraft = (id: string, patch: Partial<WarehouseDraft>) => {
    setDrafts((prev) => {
      const warehouse = warehouses.find((w) => w.id === id)
      const current = prev[id] ?? (warehouse ? draftFromWarehouse(warehouse) : null)
      if (!current) return prev
      return { ...prev, [id]: { ...current, ...patch } }
    })
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Direcciones de despacho</CardTitle>
          <CardDescription>
            Estas ubicaciones aparecen al registrar inventario, compras y cotizaciones. La
            dirección, región y comuna son obligatorias para entregas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y divide-border rounded-lg border border-border">
            {warehouses.map((warehouse) => {
              const draft = drafts[warehouse.id] ?? draftFromWarehouse(warehouse)
              const locationComplete = warehouseHasCompleteLocation({
                ...warehouse,
                ...draft,
              })
              const isDirty = !draftsMatch(warehouse, draft)

              return (
                <li
                  key={warehouse.id}
                  className={cn(
                    'space-y-3 px-4 py-4',
                    !warehouse.active && 'bg-muted/30 opacity-80',
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="default-warehouse"
                        checked={warehouse.isDefault}
                        disabled={!warehouse.active || isLoading}
                        onChange={() => {
                          void run(
                            () => setDefaultWarehouse(warehouse.id),
                            'Bodega predeterminada actualizada.',
                          )
                        }}
                        className="size-4 accent-primary"
                      />
                      <span className="text-muted-foreground">Predeterminada</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={warehouse.active}
                        disabled={isLoading || !canEdit}
                        onChange={(e) =>
                          void run(
                            () =>
                              updateWarehouse(warehouse.id, {
                                active: e.target.checked,
                              }).then(() => undefined),
                            e.target.checked
                              ? 'Bodega activada.'
                              : 'Bodega desactivada.',
                          )
                        }
                        className="size-4 rounded border-border accent-primary"
                      />
                      Activa
                    </label>
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Eliminar ${warehouse.name}`}
                        disabled={isLoading || !canEdit}
                        onClick={() => handleRemove(warehouse.id)}
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <ContactFormInput
                      id={`wh-name-${warehouse.id}`}
                      label="Nombre"
                      value={draft.name}
                      disabled={isLoading || !canEdit}
                      onChange={(name) => patchDraft(warehouse.id, { name })}
                    />
                    <ContactFormInput
                      id={`wh-code-${warehouse.id}`}
                      label="Código"
                      value={draft.code}
                      disabled={isLoading || !canEdit}
                      onChange={(code) => patchDraft(warehouse.id, { code })}
                    />
                    <ContactFormInput
                      id={`wh-address-${warehouse.id}`}
                      label="Dirección"
                      value={draft.address}
                      disabled={isLoading || !canEdit}
                      onChange={(address) => patchDraft(warehouse.id, { address })}
                      className="sm:col-span-2"
                    />
                    <RegionCommuneFields
                      regionId={`wh-region-${warehouse.id}`}
                      communeId={`wh-commune-${warehouse.id}`}
                      region={draft.region}
                      commune={draft.commune}
                      disabled={isLoading || !canEdit}
                      onRegionChange={(region) => patchDraft(warehouse.id, { region })}
                      onCommuneChange={(commune) => patchDraft(warehouse.id, { commune })}
                      onPatch={({ region, commune }) =>
                        patchDraft(warehouse.id, { region, commune })
                      }
                      className="sm:col-span-2"
                    />
                    {!locationComplete ? (
                      <p className="text-xs text-amber-700 dark:text-amber-400 sm:col-span-2">
                        Completa dirección, región y comuna para usar esta bodega en compras y
                        cotizaciones.
                      </p>
                    ) : null}
                  </div>

                  {canEdit ? (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isLoading || !isDirty}
                        onClick={() => saveWarehouse(warehouse)}
                      >
                        Guardar cambios
                      </Button>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>

          {canCreate ? (
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/20 p-4 sm:flex-row sm:items-end">
              <ContactFormInput
                id="new-warehouse"
                label="Nueva bodega"
                value={newName}
                disabled={isLoading}
                onChange={setNewName}
                placeholder="Ej. Bodega sur"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleAdd}
                disabled={isLoading}
                className="shrink-0 sm:mb-0.5"
              >
                <Plus aria-hidden className="size-4" />
                Agregar
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
