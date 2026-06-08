import { MoreHorizontal, Pencil, Tag, UserRound } from 'lucide-react'

import {
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { AvatarImageUpload } from '@/components/shared/AvatarImageUpload'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ProductDetail } from '@/data/product-detail.mock'
import type { ProductStatus } from '@/data/products.mock'
import { formatProductPriceDisplay, unitLabel } from '@/lib/product-catalog'
import { defaultProductImageUrl, initialsFromLabel } from '@/lib/image-upload'
import { RegisterActivityHeaderButton } from '@/components/shared/RegisterActivityHeaderButton'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import { productStatusVariant } from '@/lib/product-display'
import { PRODUCT_STATUS_OPTIONS, type ProductFormValues } from '@/lib/product-form'
import { useDetailHeaderPermissions } from '@/hooks/use-detail-header-permissions'
import { cn } from '@/lib/utils'

type ProductDetailHeaderProps = {
  product: ProductDetail
  isEditing?: boolean
  form?: ProductFormValues
  onFormChange?: (patch: Partial<ProductFormValues>) => void
  onStartEdit?: () => void
  onRegisterActivity?: (presetType?: ContactActivityType) => void
  onArchive?: () => void
}

export function ProductDetailHeader({
  product,
  isEditing = false,
  form,
  onFormChange,
  onStartEdit,
  onRegisterActivity,
  onArchive,
}: ProductDetailHeaderProps) {
  const { showEdit, showArchive } = useDetailHeaderPermissions('productos', {
    onStartEdit,
    onArchive,
  })

  const displayName = isEditing && form ? form.name : product.name
  const displayStatus = isEditing && form ? form.status : product.status
  const displaySku = isEditing && form ? form.sku : product.sku
  const displayCategory = isEditing && form ? form.category : product.category
  const displayPrice = isEditing && form ? form.price : product.price
  const displayStock = isEditing && form ? form.stock : product.stock
  const displayOwner = isEditing && form ? form.ownerName : product.owner
  const imageUrl =
    (isEditing && form ? form.imageUrl : product.imageUrl) ||
    defaultProductImageUrl(displayName)
  const unitOfMeasure =
    isEditing && form ? form.unitOfMeasure : product.unitOfMeasure
  const customUnit = isEditing && form ? form.customUnit : product.customUnit
  const billingPeriod =
    isEditing && form ? form.billingPeriod : product.billingPeriod
  const uom = unitLabel(unitOfMeasure, customUnit)
  const formattedPrice = formatProductPriceDisplay({
    price: displayPrice,
    unitOfMeasure,
    customUnit,
    billingPeriod,
  })

  const metrics = [
    { label: 'Venta', value: formattedPrice },
    { label: 'Unidad', value: uom },
    { label: 'Stock', value: displayStock },
    { label: 'Vendidas', value: String(product.unitsSold) },
  ]

  const patch = (partial: Partial<ProductFormValues>) => {
    onFormChange?.(partial)
  }

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm',
        isEditing ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border',
      )}
    >
      <div
        className={cn(
          'border-b border-border p-4 sm:p-5 lg:p-6',
          isEditing ? 'bg-primary/5' : 'bg-gradient-to-br from-muted/40 via-card to-card',
        )}
      >
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
            {isEditing && form ? (
              <AvatarImageUpload
                value={form.imageUrl}
                onChange={(imageUrl) => patch({ imageUrl })}
                fallbackLabel={form.name}
                shape="rounded"
                size="lg"
              />
            ) : (
              <Avatar className="size-16 rounded-xl border-2 border-border shadow-sm">
                <AvatarImage src={imageUrl} alt={displayName} />
                <AvatarFallback className="rounded-xl text-sm font-medium">
                  {initialsFromLabel(displayName)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="min-w-0 flex-1 space-y-3">
              {isEditing && form ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <ContactFormInput
                    id="pd-header-name"
                    label="Nombre"
                    value={form.name}
                    className="sm:col-span-2"
                    onChange={(name) => patch({ name })}
                  />
                  <ContactFormInput
                    id="pd-header-sku"
                    label="SKU"
                    value={form.sku}
                    onChange={(sku) => patch({ sku })}
                  />
                  <ContactFormSelect
                    id="pd-header-status"
                    label="Estado"
                    value={form.status}
                    onChange={(status) => patch({ status: status as ProductStatus })}
                    options={PRODUCT_STATUS_OPTIONS.map((s) => ({
                      value: s,
                      label: s,
                    }))}
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">
                      {displayName}
                    </h1>
                    <Badge variant={productStatusVariant(displayStatus)}>
                      {displayStatus}
                    </Badge>
                    <Badge variant="outline">{product.productType}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {displaySku} · {displayCategory}
                  </p>
                  <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <UserRound aria-hidden className="size-4 shrink-0" />
                    <span>
                      Responsable:{' '}
                      <span className="font-medium text-foreground">{displayOwner}</span>
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <Tag aria-hidden className="size-4 text-muted-foreground" />
                      {formattedPrice}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {!isEditing ? (
            <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/60 pt-4 2xl:w-auto 2xl:shrink-0 2xl:border-t-0 2xl:pt-0">
              <RegisterActivityHeaderButton onRegister={onRegisterActivity} />
              {showEdit ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border shadow-sm"
                  onClick={onStartEdit}
                >
                  <Pencil aria-hidden className="size-4" />
                  Editar
                </Button>
              ) : null}
              {showArchive ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="border-border shadow-sm">
                      <MoreHorizontal aria-hidden className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={onArchive}
                    >
                      Archivar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}