import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'

import { ContactFormInput } from '@/components/contacts/ContactFormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { useCatalogSettings } from '@/hooks/use-catalog-settings'
import {
  rootProductCategories,
  subcategoriesForParent,
  validateCategoryName,
} from '@/lib/catalog-settings'
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
  const [newSubNames, setNewSubNames] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const categories = catalog.productCategories
  const roots = useMemo(() => rootProductCategories(categories), [categories])

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

  const handleAddRoot = () => {
    const validation = validateCategoryName(categories, newName, undefined, null)
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

  const handleAddSubcategory = (parent: ProductCategorySetting) => {
    const draft = (newSubNames[parent.id] ?? '').trim()
    const validation = validateCategoryName(categories, draft, undefined, parent.id)
    if (validation) {
      toast.warning(validation)
      return
    }
    void run(async () => {
      const created = await createCategory(draft, parent.id)
      setNewSubNames((prev) => ({ ...prev, [parent.id]: '' }))
      setNameDrafts((prev) => ({ ...prev, [created.id]: created.name }))
      setExpanded((prev) => ({ ...prev, [parent.id]: true }))
      toast.success(`Subcategoría «${created.name}» agregada.`)
    })
  }

  const handleRemove = (id: string) => {
    const target = categories.find((c) => c.id === id)
    if (!target) return
    if (!target.parentId && roots.length <= 1) {
      toast.warning('Debe existir al menos una categoría.')
      return
    }
    if (!target.parentId) {
      const children = subcategoriesForParent(categories, id)
      if (children.length > 0) {
        toast.warning('Elimina primero las subcategorías de esta categoría.')
        return
      }
    }
    void run(
      () => deleteCategory(id),
      target.parentId
        ? `Subcategoría «${target.name}» eliminada.`
        : `Categoría «${target.name}» eliminada.`,
    )
  }

  const saveCategory = (category: ProductCategorySetting) => {
    const name = (nameDrafts[category.id] ?? category.name).trim()
    const err = validateCategoryName(
      categories,
      name,
      category.id,
      category.parentId ?? null,
    )
    if (err) {
      toast.warning(err)
      return
    }
    void run(
      async () => {
        const updated = await updateCategory(category.id, { name })
        setNameDrafts((prev) => ({ ...prev, [category.id]: updated.name }))
      },
      `«${name}» guardado.`,
    )
  }

  const renderCategoryRow = (category: ProductCategorySetting, nested = false) => {
    const draftName = nameDrafts[category.id] ?? category.name
    const isDirty = draftName.trim() !== category.name

    return (
      <li
        key={category.id}
        className={cn(
          'flex flex-wrap items-end gap-3 px-4 py-3',
          nested && 'border-t border-dashed border-border bg-muted/10 ps-8',
          !category.active && 'opacity-80',
        )}
      >
        <ContactFormInput
          id={`cat-${category.id}`}
          label={nested ? 'Subcategoría' : 'Nombre'}
          value={draftName}
          disabled={isLoading || !canEdit}
          onChange={(name) => setNameDrafts((prev) => ({ ...prev, [category.id]: name }))}
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
                e.target.checked ? 'Categoría activada.' : 'Categoría desactivada.',
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
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Categorías de productos</CardTitle>
          <CardDescription>
            Clasificación usada en el catálogo de productos, filtros y la integración externa.
            Puedes agregar subcategorías opcionales bajo cada categoría.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y divide-border rounded-lg border border-border">
            {roots.map((category) => {
              const children = subcategoriesForParent(categories, category.id)
              const isOpen = expanded[category.id] ?? children.length > 0

              return (
                <li key={category.id} className="divide-y divide-border">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      className="mt-3 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={isOpen ? 'Ocultar subcategorías' : 'Ver subcategorías'}
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [category.id]: !isOpen }))
                      }
                    >
                      {isOpen ? (
                        <ChevronDown aria-hidden className="size-4" />
                      ) : (
                        <ChevronRight aria-hidden className="size-4" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <ul>
                        {renderCategoryRow(category)}
                        {isOpen ? (
                          <>
                            {children.map((child) => renderCategoryRow(child, true))}
                            {canCreate ? (
                              <li className="flex flex-wrap items-end gap-3 border-t border-dashed border-border bg-muted/10 px-4 py-3 ps-8">
                                <ContactFormInput
                                  id={`new-sub-${category.id}`}
                                  label="Nueva subcategoría (opcional)"
                                  value={newSubNames[category.id] ?? ''}
                                  disabled={isLoading}
                                  onChange={(value) =>
                                    setNewSubNames((prev) => ({
                                      ...prev,
                                      [category.id]: value,
                                    }))
                                  }
                                  placeholder="Ej. Licencias"
                                  className="min-w-[200px] flex-1"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isLoading}
                                  className="sm:mb-0.5"
                                  onClick={() => handleAddSubcategory(category)}
                                >
                                  <Plus aria-hidden className="size-4" />
                                  Agregar subcategoría
                                </Button>
                              </li>
                            ) : null}
                          </>
                        ) : null}
                      </ul>
                    </div>
                  </div>
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
                onClick={handleAddRoot}
                disabled={isLoading}
                className="shrink-0 sm:mb-0.5"
              >
                <Plus aria-hidden className="size-4" />
                Agregar categoría
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
