import {
  ArrowDownToLine,
  ArrowLeft,
  Boxes,
  ChevronRight,
  FileText,
  LayoutList,
  ShoppingCart,
  StickyNote,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { apiActionErrorMessage } from '@/api/errors'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { toast } from '@/lib/toast'

import { EditProductDialog } from '@/components/products/EditProductDialog'
import { ProductDetailHeader } from '@/components/products/ProductDetailHeader'
import { ProductDetailSidebar } from '@/components/products/ProductDetailSidebar'
import { ProductRelatedInventoryPanel } from '@/components/products/ProductRelatedInventoryPanel'
import { ProductRelatedInvoicesPanel } from '@/components/products/ProductRelatedInvoicesPanel'
import { ProductRelatedPurchasesPanel } from '@/components/products/ProductRelatedPurchasesPanel'
import { ProductRelatedStockReceiptsPanel } from '@/components/products/ProductRelatedStockReceiptsPanel'
import { RegisterActivityDialog } from '@/components/contacts/RegisterActivityDialog'
import { EntityActivitiesSection } from '@/components/shared/EntityActivitiesSection'
import { EntityNotesPanel } from '@/components/shared/EntityNotesPanel'
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
import type { ContactActivity, ContactActivityType } from '@/data/contact-detail.mock'
import { useEntityNotes } from '@/hooks/use-entity-notes'
import type { ProductDetail } from '@/data/product-detail.mock'
import { loadProductDetail } from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { useProductsRegistry } from '@/hooks/use-products-registry'
import { useStockSync } from '@/hooks/use-stock-sync'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import {
  PRODUCT_ARCHIVE_INVENTORY_WARNING,
  PRODUCT_ARCHIVE_RETENTION_DAYS,
} from '@/lib/product-archive'
import { productRelationCounts } from '@/lib/product-relations'
import {
  parseProductDetailTab,
  type ProductDetailTab,
} from '@/lib/product-routes'
import { cn } from '@/lib/utils'

const tabs: { id: ProductDetailTab; label: string; Icon: typeof LayoutList }[] = [
  { id: 'detalle', label: 'Detalle', Icon: LayoutList },
  { id: 'actividad', label: 'Actividad', Icon: Zap },
  { id: 'inventario', label: 'Inventario', Icon: Boxes },
  { id: 'ingresos', label: 'Ingresos', Icon: ArrowDownToLine },
  { id: 'compras', label: 'Compras', Icon: ShoppingCart },
  { id: 'facturas', label: 'Facturas', Icon: FileText },
  { id: 'notas', label: 'Notas', Icon: StickyNote },
]

export function ProductDetailPage() {
  const navigate = useNavigate()
  const { productId } = useParams<{ productId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: ProductDetailTab = parseProductDetailTab(searchParams) ?? 'detalle'
  const { canEdit, canDelete } = useModulePermissions('productos')
  const { archiveProduct, isArchived, updateProductFromDetail } = useProductsRegistry()
  const stockVersion = useStockSync()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: productId,
    load: loadProductDetail,
    isArchived,
    onLoaded: (id, record) => {
      setProduct(record)
      recordEntityView('productos', id)
    },
    deps: [stockVersion],
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [activityPresetType, setActivityPresetType] =
    useState<ContactActivityType>('llamada')
  const [inventoryCount, setInventoryCount] = useState(0)
  const [ingresosCount, setIngresosCount] = useState(0)
  const [comprasCount, setComprasCount] = useState(0)
  const [facturasCount, setFacturasCount] = useState(0)

  const selectTab = useCallback(
    (next: ProductDetailTab) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (next === 'detalle') {
            params.delete('tab')
          } else {
            params.set('tab', next)
          }
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const relationCounts = useMemo(
    () => (product ? productRelationCounts(product) : null),
    [product, stockVersion],
  )

  useEffect(() => {
    if (!relationCounts) return
    setInventoryCount(relationCounts.inventory)
    setIngresosCount(relationCounts.ingresos)
    setComprasCount(relationCounts.compras)
    setFacturasCount(relationCounts.facturas)
  }, [relationCounts])

  const handleProductSaved = useCallback(
    async (updated: ProductDetail, previousSku?: string) => {
      await updateProductFromDetail(updated, { previousSku })
      setProduct(updated)
      toast.success(`Producto «${updated.name}» actualizado correctamente.`)
    },
    [updateProductFromDetail],
  )

  const handleArchiveConfirm = useCallback(async () => {
    if (!productId) return
    try {
      await archiveProduct(productId)
      setArchiveOpen(false)
      navigate('/productos')
      toast.success('Producto archivado.')
    } catch (error) {
      toast.error(
        apiActionErrorMessage(error, 'No se pudo archivar el producto.'),
      )
    }
  }, [archiveProduct, productId, navigate])

  const { onAddNote: handleAddNote, onDeleteNote: handleDeleteNote } = useEntityNotes({
    scope: 'producto',
    entityId: productId,
    setRecord: setProduct,
    onAdded: () => selectTab('notas'),
    onAfterChange: (next) => {
      void updateProductFromDetail(next)
    },
  })

  const openRegisterActivity = useCallback(
    (presetType: ContactActivityType = 'llamada') => {
      setActivityPresetType(presetType)
      setActivityDialogOpen(true)
    },
    [],
  )

  const handleActivitySaved = useCallback(
    (activity: ContactActivity) => {
      setProduct((prev) => {
        if (!prev) return prev
        const next = { ...prev, activities: [activity, ...prev.activities] }
        updateProductFromDetail(next)
        return next
      })
      selectTab('actividad')
    },
    [selectTab, updateProductFromDetail],
  )

  const tabCount = (id: ProductDetailTab): number | undefined => {
    switch (id) {
      case 'actividad':
        return product?.activities.length
      case 'inventario':
        return inventoryCount
      case 'ingresos':
        return ingresosCount
      case 'compras':
        return comprasCount
      case 'facturas':
        return facturasCount
      default:
        return undefined
    }
  }

  if (loadState === 'loading') {
    return <RecordDetailLoading />
  }

  if (loadState === 'unavailable') {
    return (
      <RecordUnavailableView
        module="productos"
        reason={reason}
        detail={unavailableDetail}
        recordId={productId}
      onRetry={reload}
      />
    )
  }

  if (!product) {
    return <RecordDetailLoading />
  }

  return (
    <PageScrollArea className="space-y-4 p-3 pb-8 sm:space-y-5 sm:p-4 sm:pb-10 lg:p-6">
      <nav aria-label="Miga de pan" className="flex flex-wrap items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link to="/productos">
            <ArrowLeft aria-hidden className="size-4" />
            Productos
          </Link>
        </Button>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        <span className="truncate font-medium text-foreground">{product.name}</span>
      </nav>

      <ProductDetailHeader
        product={product}
        onStartEdit={canEdit ? () => setEditDialogOpen(true) : undefined}
        onRegisterActivity={openRegisterActivity}
        onArchive={canDelete ? () => setArchiveOpen(true) : undefined}
      />

      <RegisterActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        relatedType="producto"
        contactId={product.id}
        contactName={product.name}
        companyName={product.sku}
        defaultAuthor="María López"
        presetType={activityPresetType}
        onSaved={handleActivitySaved}
      />

      {canEdit ? (
        <EditProductDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          product={product}
          onSave={handleProductSaved}
        />
      ) : null}

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar producto</DialogTitle>
            <DialogDescription className="space-y-2">
              <span>
                «{product.name}» irá a Archivados (papelera) durante{' '}
                {PRODUCT_ARCHIVE_RETENTION_DAYS} días. Después se eliminará de forma definitiva si
                no lo restauras.
              </span>
              <span className="block text-muted-foreground">
                {PRODUCT_ARCHIVE_INVENTORY_WARNING}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setArchiveOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleArchiveConfirm}>
              Archivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-w-0 space-y-4">
        <div
          className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Secciones del producto"
        >
          {tabs.map(({ id, label, Icon }) => {
            const count = tabCount(id)
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => selectTab(id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:gap-2 sm:px-4 sm:py-2.5',
                  tab === id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon aria-hidden className="size-4 opacity-70" />
                {label}
                {count !== undefined && count > 0 ? (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                    {count}
                  </Badge>
                ) : null}
              </button>
            )
          })}
        </div>

        {tab === 'detalle' ? (
          <ProductDetailSidebar product={product} />
        ) : null}

        {tab === 'actividad' ? (
          <EntityActivitiesSection
            activities={product.activities}
            entityKind="producto"
            onRegister={() => openRegisterActivity()}
          />
        ) : null}

        {tab === 'inventario' ? (
          <ProductRelatedInventoryPanel
            product={product}
            onCountChange={setInventoryCount}
          />
        ) : null}

        {tab === 'ingresos' ? (
          <ProductRelatedStockReceiptsPanel
            product={product}
            onCountChange={setIngresosCount}
          />
        ) : null}

        {tab === 'compras' ? (
          <ProductRelatedPurchasesPanel
            product={product}
            onCountChange={setComprasCount}
          />
        ) : null}

        {tab === 'facturas' ? (
          <ProductRelatedInvoicesPanel
            product={product}
            onCountChange={setFacturasCount}
          />
        ) : null}

        {tab === 'notas' ? (
          <EntityNotesPanel
            notes={product.notes}
            authorName="Equipo comercial"
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
          />
        ) : null}
      </div>
    </PageScrollArea>
  )
}
