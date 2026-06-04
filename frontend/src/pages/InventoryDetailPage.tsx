import {
  ArrowLeft,
  Boxes,
  ChevronRight,
  FolderOpen,
  LayoutList,
  ListOrdered,
  MapPin,
  ShoppingCart,
  StickyNote,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { EntityActivitiesSection } from '@/components/shared/EntityActivitiesSection'
import { RegisterActivityDialog } from '@/components/contacts/RegisterActivityDialog'
import { AdjustInventoryStockDialog } from '@/components/inventory/AdjustInventoryStockDialog'
import { InventoryDetailHeader } from '@/components/inventory/InventoryDetailHeader'
import { InventoryDetailOverview } from '@/components/inventory/InventoryDetailOverview'
import { InventoryFilesPanel } from '@/components/inventory/InventoryFilesPanel'
import { InventoryMovementsPanel } from '@/components/inventory/InventoryMovementsPanel'
import { InventoryWarehouseBreakdownPanel } from '@/components/inventory/InventoryWarehouseBreakdownPanel'
import { InventoryRelatedProductPanel } from '@/components/inventory/InventoryRelatedProductPanel'
import { InventoryRelatedPurchasesPanel } from '@/components/inventory/InventoryRelatedPurchasesPanel'
import { EntityNotesPanel } from '@/components/shared/EntityNotesPanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ContactActivity, ContactActivityType } from '@/data/contact-detail.mock'
import { useEntityNotes } from '@/hooks/use-entity-notes'
import type { InventoryDetail } from '@/data/inventory-detail.mock'
import { loadInventoryDetail } from '@/lib/entity-detail-loaders'
import { useRecordDetail } from '@/hooks/use-record-detail'
import { RecordDetailLoading } from '@/components/shared/RecordDetailLoading'
import { RecordUnavailableView } from '@/components/shared/RecordUnavailableView'
import { getInventoryProductSummaryById } from '@/lib/inventory-aggregate'
import { useInventoryRegistry } from '@/hooks/use-inventory-registry'
import { useStockSync } from '@/hooks/use-stock-sync'
import { recordEntityView } from '@/lib/entity-recently-viewed'
import { persistInventoryFiles } from '@/lib/inventory-files'
import { apiActionErrorMessage } from '@/api/errors'
import { toast } from '@/lib/toast'
import {
  parseInventoryDetailTab,
  type InventoryDetailTab,
} from '@/lib/inventory-routes'
import { useModulePermissions } from '@/hooks/use-module-permissions'
import { cn } from '@/lib/utils'

const baseTabs: { id: InventoryDetailTab; label: string; Icon: typeof Zap }[] = [
  { id: 'detalle', label: 'Detalle', Icon: LayoutList },
  { id: 'bodegas', label: 'Bodegas', Icon: MapPin },
  { id: 'actividad', label: 'Actividad', Icon: Zap },
  { id: 'movimientos', label: 'Movimientos', Icon: ListOrdered },
  { id: 'compras', label: 'Compras', Icon: ShoppingCart },
  { id: 'productos', label: 'Producto', Icon: Boxes },
  { id: 'notas', label: 'Notas', Icon: StickyNote },
  { id: 'archivos', label: 'Archivos', Icon: FolderOpen },
]

export function InventoryDetailPage() {
  const { inventoryId } = useParams<{ inventoryId: string }>()
  const { canEdit } = useModulePermissions('inventario')
  const { updateInventoryFromDetail } = useInventoryRegistry()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: InventoryDetailTab = parseInventoryDetailTab(searchParams) ?? 'detalle'
  const stockVersion = useStockSync()
  const [inventory, setInventory] = useState<InventoryDetail | null>(null)
  const { loadState, reason, unavailableDetail, reload } = useRecordDetail({
    id: inventoryId,
    load: loadInventoryDetail,
    onLoaded: (id, record) => {
      setInventory(record)
      recordEntityView('inventario', id)
    },
    deps: [stockVersion],
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [activityPresetType, setActivityPresetType] =
    useState<ContactActivityType>('llamada')
  const [purchaseCount, setPurchaseCount] = useState(0)
  const [hasLinkedProduct, setHasLinkedProduct] = useState(false)

  const selectTab = useCallback(
    (next: InventoryDetailTab) => {
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

  useEffect(() => {
    if (!inventory?.isProductView && tab === 'bodegas') {
      selectTab('detalle')
    }
  }, [inventory?.isProductView, tab, selectTab])

  const tabs = useMemo(
    () =>
      inventory?.isProductView
        ? baseTabs
        : baseTabs.filter((t) => t.id !== 'bodegas'),
    [inventory?.isProductView],
  )

  const productSummary = useMemo(
    () =>
      inventory?.isProductView
        ? getInventoryProductSummaryById(inventory.id)
        : null,
    [inventory],
  )

  const handleStockApplied = useCallback(() => {
    if (!inventoryId) return
    loadInventoryDetail(inventoryId).then((refreshed) => {
      void updateInventoryFromDetail(refreshed)
      setInventory(refreshed)
    })
  }, [inventoryId, updateInventoryFromDetail])

  const openRegisterActivity = useCallback(
    (presetType: ContactActivityType = 'llamada') => {
      setActivityPresetType(presetType)
      setActivityDialogOpen(true)
    },
    [],
  )

  const handleActivitySaved = useCallback(
    (activity: ContactActivity) => {
      setInventory((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          activities: [activity, ...prev.activities],
        }
      })
      selectTab('actividad')
    },
    [selectTab],
  )

  const inventoryEntityId =
    inventory?.recordEntityId ?? inventory?.id ?? inventoryId

  const { onAddNote: handleAddNote, onDeleteNote: handleDeleteNote } = useEntityNotes({
    scope: 'inventario',
    entityId: inventoryEntityId,
    setRecord: setInventory,
    onAdded: () => selectTab('notas'),
    onAfterChange: (next) => {
      void updateInventoryFromDetail(next)
    },
  })

  const handleFilesChange = useCallback(
    async (files: InventoryDetail['files']) => {
      if (!inventory) return
      const label = `${inventory.productName} (${inventory.sku})`
      setInventory((prev) => (prev ? { ...prev, files } : prev))
      try {
        const saved = await persistInventoryFiles(
          inventory.recordEntityId ?? inventory.id,
          label,
          files,
        )
        setInventory((prev) => (prev ? { ...prev, files: saved } : prev))
      } catch (error) {
        toast.error(
          apiActionErrorMessage(error, 'No se pudieron guardar los archivos.'),
        )
      }
    },
    [inventory],
  )

  if (loadState === 'loading') {
    return <RecordDetailLoading />
  }

  if (loadState === 'unavailable') {
    return (
      <RecordUnavailableView
        module="inventario"
        reason={reason}
        detail={unavailableDetail}
        recordId={inventoryId}
      onRetry={reload}
      />
    )
  }

  if (!inventory) {
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
          <Link to="/inventario">
            <ArrowLeft aria-hidden className="size-4" />
            Inventario
          </Link>
        </Button>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        <span className="truncate font-medium text-foreground">{inventory.productName}</span>
      </nav>

      <InventoryDetailHeader
        inventory={inventory}
        onStartEdit={canEdit ? () => setEditDialogOpen(true) : undefined}
        onRegisterActivity={openRegisterActivity}
      />

      {canEdit ? (
        <AdjustInventoryStockDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          inventory={inventory}
          onApplied={handleStockApplied}
        />
      ) : null}

      <RegisterActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        contactId={inventory.id}
        contactName={inventory.productName}
        defaultAuthor={inventory.owner}
        presetType={activityPresetType}
        onSaved={handleActivitySaved}
      />

      <div className="min-w-0 space-y-4">
        <div
          className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Secciones del inventario"
        >
          {tabs.map(({ id, label, Icon }) => (
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
              {id === 'bodegas' && productSummary ? (
                <Badge variant="secondary" className="ms-0.5 font-normal">
                  {productSummary.warehouseCount}
                </Badge>
              ) : null}
              {id === 'movimientos' && inventory.movements.length > 0 ? (
                <Badge variant="secondary" className="ms-0.5 font-normal">
                  {inventory.movements.length}
                </Badge>
              ) : null}
              {id === 'compras' && purchaseCount > 0 ? (
                <Badge variant="secondary" className="ms-0.5 font-normal">
                  {purchaseCount}
                </Badge>
              ) : null}
              {id === 'productos' && hasLinkedProduct ? (
                <Badge variant="secondary" className="ms-0.5 font-normal">
                  1
                </Badge>
              ) : null}
              {id === 'archivos' && inventory.files.length > 0 ? (
                <Badge variant="secondary" className="ms-0.5 font-normal">
                  {inventory.files.length}
                </Badge>
              ) : null}
            </button>
          ))}
        </div>

        {tab === 'detalle' ? (
          <InventoryDetailOverview
            inventory={inventory}
            onGoToWarehouses={
              inventory.isProductView ? () => selectTab('bodegas') : undefined
            }
          />
        ) : null}

        {tab === 'bodegas' && productSummary ? (
          <InventoryWarehouseBreakdownPanel product={productSummary} />
        ) : null}

        {tab === 'actividad' ? (
          <EntityActivitiesSection
            activities={inventory.activities}
            entityKind="inventario"
            onRegister={() => openRegisterActivity()}
          />
        ) : null}

        {tab === 'movimientos' ? <InventoryMovementsPanel inventory={inventory} /> : null}

        {tab === 'compras' ? (
          <InventoryRelatedPurchasesPanel
            inventory={inventory}
            onCountChange={setPurchaseCount}
          />
        ) : null}

        {tab === 'productos' ? (
          <InventoryRelatedProductPanel
            inventory={inventory}
            onCountChange={setHasLinkedProduct}
          />
        ) : null}

        {tab === 'notas' ? (
          <EntityNotesPanel
            notes={inventory.notes}
            authorName={inventory.owner}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
          />
        ) : null}

        {tab === 'archivos' ? (
          <InventoryFilesPanel
            authorName={inventory.owner}
            files={inventory.files}
            onFilesChange={handleFilesChange}
          />
        ) : null}
      </div>
    </PageScrollArea>
  )
}
