import { Archive } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'

import { ListPageLayout } from '@/components/list/ListPageLayout'
import { ModuleListPage, type ListSelectionAction } from '@/components/list/ModuleListPage'
import { useEmbeddedListToolbarSlot } from '@/hooks/use-embedded-list-toolbar-slot'
import { CreateProductDialog } from '@/components/products/CreateProductDialog'
import { DuplicateProductDialog } from '@/components/products/DuplicateProductDialog'
import { ImportProductsDialog } from '@/components/products/ImportProductsDialog'
import { EditProductDialog } from '@/components/products/EditProductDialog'
import { ProductsArchivedView } from '@/components/products/ProductsArchivedView'
import { ProductsKanbanView } from '@/components/products/ProductsKanbanView'
import {
  ProductsModuleHeader,
  type ProductsViewId,
} from '@/components/products/ProductsModuleHeader'
import { ProductsSegmentsView } from '@/components/products/ProductsSegmentsView'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { productsListConfig } from '@/config/list-modules/products'
import type { ProductDetail } from '@/data/product-detail.mock'
import { getProductDetail, resolveProductListItem } from '@/data/product-detail.mock'
import { resolveApiListRow } from '@/lib/resolve-list-row'
import type { ProductListItem } from '@/data/products.mock'
import { apiActionErrorMessage } from '@/api/errors'
import { isApiEnabled } from '@/api/config'
import { useProductsRegistry } from '@/hooks/use-products-registry'
import { fetchProductsServerPage } from '@/lib/module-server-list'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import {
  duplicateProductFormValues,
  type CreateProductFormValues,
} from '@/lib/product-create'
import {
  createDefaultProductFilters,
  productRowMatchesFilters,
  type ProductFilters,
} from '@/lib/product-filters'
import { PRODUCT_ARCHIVE_RETENTION_DAYS, PRODUCT_ARCHIVE_INVENTORY_WARNING } from '@/lib/product-archive'
import {
  loadProductRecentIds,
  productMatchesListScope,
  sortProductsByRecentlyViewed,
  type ProductListScope,
} from '@/lib/product-list-scope'

export function ProductsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { canEdit, canDelete } = useModulePermissions('productos')
  const {
    allProducts,
    addProduct,
    addProducts,
    updateProductFromDetail,
    archiveProduct,
    archiveProducts,
    archivedProducts,
    isArchived,
    reloadFromApi,
  } = useProductsRegistry()

  const [view, setView] = useState<ProductsViewId>('lista')
  const [listScope, setListScope] = useState<ProductListScope>('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<ProductFilters>(() =>
    createDefaultProductFilters(),
  )
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const { toolbarHost, toolbarSlot } = useEmbeddedListToolbarSlot()

  const recentIds = useMemo(
    () => loadProductRecentIds(),
    [listRefreshKey, location.key, listScope],
  )

  const rowPredicate = useMemo(
    () => (row: ProductListItem) =>
      productRowMatchesFilters(row, filters) &&
      !isArchived(row.id) &&
      productMatchesListScope(row, listScope, recentIds),
    [filters, isArchived, listScope, recentIds],
  )

  const postFilterSort = useMemo(() => {
    if (listScope !== 'recent') return undefined
    return (rows: ProductListItem[]) => sortProductsByRecentlyViewed(rows, recentIds)
  }, [listScope, recentIds])

  useEffect(() => {
    if (location.pathname === '/productos') {
      setListRefreshKey((k) => k + 1)
    }
  }, [location.pathname, location.key])

  useEffect(() => {
    if (!isApiEnabled()) return
    if (view !== 'lista' || listScope === 'recent') {
      void reloadFromApi().catch(() => {})
    }
  }, [view, listScope, reloadFromApi])

  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [createInitial, setCreateInitial] = useState<Partial<CreateProductFormValues>>()
  const [createTitle, setCreateTitle] = useState('Nuevo producto')
  const [editOpen, setEditOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductDetail | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ProductListItem | null>(null)
  const [bulkArchiveIds, setBulkArchiveIds] = useState<string[] | null>(null)

  const handleCreateSubmit = useCallback(
    async (values: import('@/lib/product-form').ProductFormValues) => {
      const item = await addProduct(values)
      toast.success(`Producto «${item.name}» creado correctamente.`)
      navigate(`/productos/${item.id}`)
    },
    [addProduct, navigate],
  )

  const handleDuplicateSelect = useCallback((source: ProductListItem) => {
    setCreateInitial(duplicateProductFormValues(source))
    setCreateTitle('Duplicar producto')
    setCreateOpen(true)
  }, [])

  const resolveListRow = useCallback(
    (row: ProductListItem) =>
      resolveApiListRow(row, resolveProductListItem),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listRefreshKey],
  )

  const openEditProduct = useCallback((row: ProductListItem) => {
    setEditingProduct(getProductDetail(row.id))
    setEditOpen(true)
  }, [])

  const handleEditSaved = useCallback(
    async (updated: ProductDetail, previousSku?: string) => {
      await updateProductFromDetail(updated, { previousSku })
      setListRefreshKey((k) => k + 1)
      toast.success(`Producto «${updated.name}» actualizado correctamente.`)
    },
    [updateProductFromDetail],
  )

  const openArchiveProduct = useCallback((row: ProductListItem) => {
    setArchiveTarget(row)
  }, [])

  const handleArchiveConfirm = useCallback(async () => {
    if (!archiveTarget) return
    const name = archiveTarget.name
    try {
      await archiveProduct(archiveTarget.id)
      setArchiveTarget(null)
      setListRefreshKey((k) => k + 1)
      toast.success(`Producto «${name}» archivado.`)
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar el producto.'),
      )
    }
  }, [archiveProduct, archiveTarget])

  const handleBulkArchiveConfirm = useCallback(async () => {
    if (!bulkArchiveIds?.length) return
    const count = bulkArchiveIds.length
    try {
      await archiveProducts(bulkArchiveIds)
      setBulkArchiveIds(null)
      setListRefreshKey((k) => k + 1)
      toast.success(
        `${count} producto${count === 1 ? '' : 's'} archivado${count === 1 ? '' : 's'}.`,
      )
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudieron archivar los productos.'),
      )
    }
  }, [archiveProducts, bulkArchiveIds])

  const listSelectionActions = useMemo<ListSelectionAction[]>(
    () =>
      canDelete
        ? [
            {
              label: 'Archivar',
              icon: Archive,
              variant: 'destructive',
              onClick: (ids) => setBulkArchiveIds(ids),
            },
          ]
        : [],
    [canDelete],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ListPageLayout
        header={
          <ProductsModuleHeader
        view={view}
        onViewChange={setView}
        query={query}
        onQueryChange={setQuery}
        onCreateNew={() => {
          setCreateInitial(undefined)
          setCreateTitle('Nuevo producto')
          setCreateOpen(true)
        }}
        onDuplicate={() => setDuplicateOpen(true)}
        onImportCsv={() => setImportOpen(true)}
        filters={filters}
        onFiltersChange={setFilters}
        listScope={listScope}
        onListScopeChange={setListScope}
        archivedCount={archivedProducts.length}
        toolbarEnd={view === 'lista' ? toolbarSlot : undefined}
      />
        }
      >
            

      {view === 'lista' ? (
        <ModuleListPage
          config={productsListConfig}
          embedded
          toolbarHost={toolbarHost}
          searchQuery={query}
          extraSeeds={listScope === 'recent' ? allProducts : []}
          serverList={
            listScope === 'recent'
              ? undefined
              : {
                  fetchPage: (params) => fetchProductsServerPage(params),
                  resetKey: `${listRefreshKey}-${listScope}`,
                }
          }
          rowPredicate={rowPredicate}
          resolveRow={resolveListRow}
          onEditRow={canEdit ? openEditProduct : undefined}
          onArchiveRow={canDelete ? openArchiveProduct : undefined}
          postFilterSort={postFilterSort}
          selectionActions={listSelectionActions}
          clearSelectionKey={listRefreshKey}
        />
      ) : null}

      {view === 'kanban' ? (
        <ProductsKanbanView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
        />
      ) : null}

      {view === 'segmentos' ? (
        <ProductsSegmentsView
          query={query}
          filters={filters}
          listScope={listScope}
          recentIds={recentIds}
        />
      ) : null}

      {view === 'archivados' ? (
        <ProductsArchivedView query={query} />
      ) : null}

      </ListPageLayout>
      <CreateProductDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={createTitle}
        description={
          createTitle === 'Duplicar producto'
            ? 'Revisa los datos copiados y guarda el nuevo registro.'
            : undefined
        }
        initialValues={createInitial}
        onSubmit={handleCreateSubmit}
      />

      <DuplicateProductDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        products={allProducts}
        onSelectDuplicate={handleDuplicateSelect}
      />

      <ImportProductsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={async (rows) => {
          const items = await addProducts(rows)
          setListRefreshKey((k) => k + 1)
          toast.success(
            `${items.length} producto${items.length === 1 ? '' : 's'} importado${items.length === 1 ? '' : 's'}.`,
          )
        }}
      />

      {canEdit && editingProduct ? (
        <EditProductDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) setEditingProduct(null)
          }}
          product={editingProduct}
          onSave={handleEditSaved}
        />
      ) : null}

      <Dialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar producto</DialogTitle>
            <DialogDescription className="space-y-2">
              {archiveTarget ? (
                <>
                  <span>
                    «{archiveTarget.name}» irá a Archivados (papelera) durante{' '}
                    {PRODUCT_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma
                    definitiva.
                  </span>
                  <span className="block text-muted-foreground">
                    {PRODUCT_ARCHIVE_INVENTORY_WARNING}
                  </span>
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setArchiveTarget(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleArchiveConfirm}>
              Archivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkArchiveIds !== null && bulkArchiveIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setBulkArchiveIds(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Archivar {bulkArchiveIds?.length ?? 0} producto
              {bulkArchiveIds && bulkArchiveIds.length === 1 ? '' : 's'}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <span>
                Los productos seleccionados irán a Archivados durante{' '}
                {PRODUCT_ARCHIVE_RETENTION_DAYS} días. Podrás restaurarlos o eliminarlos desde la
                papelera antes de la eliminación definitiva.
              </span>
              <span className="block text-muted-foreground">
                {PRODUCT_ARCHIVE_INVENTORY_WARNING}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setBulkArchiveIds(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleBulkArchiveConfirm}>
              Archivar selección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}