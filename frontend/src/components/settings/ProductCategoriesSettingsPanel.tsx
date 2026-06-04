import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from '@/lib/toast'

import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useCatalogSettings } from '@/hooks/use-catalog-settings'
import { validateCategoryName } from '@/lib/catalog-settings'
import type { ProductCategorySetting } from '@/types/catalog-settings'
import { cn } from '@/lib/utils'

export function ProductCategoriesSettingsPanel() {
  const { canCreate, canEdit, canDelete } = useModulePermissions('productos')
  const {
    catalog,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCatalogSettings()
  const [newName, setNewName] = useState('')
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({})

  const categories = catalog.productCategories

  useEffect(() => {
    setNameDrafts((prev) => {
      const next = { ...prev }
      for (const c of categories) {
        if (next[c.id] === undefined) {
          next[c.id] = c.name
        }
      }
      return next
    })
  }, [categories])

  const run = async (fn: () => Promise<void>, success?: string) => {
    try {
      await fn()
      if (success) toast.success(success)
    } catch (err) {
      toast.warning(err instanceof Error ? err.message : 'No se pudo guardar la categoría.')
    }
  }

  const handleAdd = () => {
    const validation = validateCategoryName(categories, newName)
    if (validation) {
      toast.warning(validation)
      return
    }
    void run(async () => {
      const created = await createCategory(newName)
      setNewName('')
      setNameDrafts((prev) => ({ ...prev, [created.id]: created.name }))
      toast.success(`Categoría «${created.name}» agregada.`)
    })
  }

  const handleRemove = (id: string) => {
    const target = categories.find((c) => c.id === id)
    if (!target) return
    if (categories.length <= 1) {
      toast.warning('Debe existir al menos una categoría.')
      return
    }
    void run(
      () => deleteCategory(id),
      `Categoría «${target.name}» eliminada.`,
    )
  }

  const saveCategory = (category: ProductCategorySetting) => {
    const name = (nameDrafts[category.id] ?? category.name).trim()
    const err = validateCategoryName(categories, name, category.id)
    if (err) {
      toast.warning(err)
      return
    }
    void run(
      async () => {
        const updated = await updateCategory(category.id, { name })
        setNameDrafts((prev) => ({ ...prev, [category.id]: updated.name }))
      },
      `Categoría «${name}» guardada.`,
    )
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Categorías de productos</CardTitle>
          <CardDescription>
            Clasificación usada en el catálogo de productos y filtros del módulo Productos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y divide-border rounded-lg border border-border">
            {categories.map((category) => {
              const draftName = nameDrafts[category.id] ?? category.name
              const isDirty = draftName.trim() !== category.name

              return (
                <li
                  key={category.id}
                  className={cn(
                    'flex flex-wrap items-end gap-3 px-4 py-3',
                    !category.active && 'bg-muted/30 opacity-80',
                  )}
                >
                  <ContactFormInput
                    id={`cat-${category.id}`}
                    label="Nombre"
                    value={draftName}
                    disabled={isLoading || !canEdit}
                    onChange={(name) =>
                      setNameDrafts((prev) => ({ ...prev, [category.id]: name }))
                    }
                    className="min-w-[200px] flex-1"
                  />
                  <label className="flex items-center gap-2 pb-2 text-sm">
                    <input
                      type="checkbox"
                      checked={category.active}
                      disabled={isLoading || !canEdit}
                      onChange={(e) =>
                        void run(
                          () =>
                            updateCategory(category.id, {
                              active: e.target.checked,
                            }).then(() => undefined),
                          e.target.checked
                            ? 'Categoría activada.'
                            : 'Categoría desactivada.',
                        )
                      }
                      className="size-4 rounded border-border accent-primary"
                    />
                    Activa
                  </label>
                  {canEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isLoading || !isDirty}
                      onClick={() => saveCategory(category)}
                    >
                      Guardar
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mb-0.5 text-muted-foreground hover:text-destructive"
                      aria-label={`Eliminar ${category.name}`}
                      disabled={isLoading}
                      onClick={() => handleRemove(category.id)}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  ) : null}
                </li>
              )
            })}
          </ul>

          {canCreate ? (
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/20 p-4 sm:flex-row sm:items-end">
              <ContactFormInput
                id="new-category"
                label="Nueva categoría"
                value={newName}
                disabled={isLoading}
                onChange={setNewName}
                placeholder="Ej. Repuestos"
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
