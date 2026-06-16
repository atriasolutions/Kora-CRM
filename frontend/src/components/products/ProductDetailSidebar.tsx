import {
  Barcode,
  Box,
  DollarSign,
  Layers,
  Ruler,
  Snowflake,
  Tag,
  TrendingUp,
  UserRound,
} from 'lucide-react'

import { ContactFormSection } from '@/components/contacts/ContactFormSection'
import { ProductFormFields } from '@/components/products/ProductFormFields'
import { RecordAuditMeta } from '@/components/shared/RecordAuditMeta'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProductDetail } from '@/data/product-detail.mock'
import { initialsFromLabel } from '@/lib/image-upload'
import { formatProductPriceDisplay, unitLabel } from '@/lib/product-catalog'
import type { ProductFormValues } from '@/lib/product-form'

type ProductDetailSidebarProps = {
  product: ProductDetail
  isEditing?: boolean
  form?: ProductFormValues
  onFormChange?: (patch: Partial<ProductFormValues>) => void
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  const display = value.trim() || '—'
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-end text-sm font-medium text-foreground">
        {display}
      </span>
    </div>
  )
}

export function ProductDetailSidebar({
  product,
  isEditing = false,
  form,
  onFormChange,
}: ProductDetailSidebarProps) {
  if (isEditing && form && onFormChange) {
    return (
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="border-primary/20 shadow-sm ring-1 ring-primary/10 lg:col-span-2 xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Editar producto</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductFormFields
              form={form}
              inventoryContextSku={product.sku}
              onChange={onFormChange}
              showImage={false}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  const uom = unitLabel(product.unitOfMeasure, product.customUnit)
  const hasDimensions =
    product.dimensions.length ||
    product.dimensions.width ||
    product.dimensions.height
  const showMeasures =
    (product.productType === 'Físico' || product.productType === 'Combo') &&
    (hasDimensions || product.weight || product.requiresRefrigeration)
  const ownerInitials = initialsFromLabel(product.owner)
  const supplierLabel = product.supplierName
    ? `${product.supplierName}${product.supplierSku ? ` · ${product.supplierSku}` : ''}`
    : ''

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <ContactFormSection title="Identificación" icon={Tag} className="bg-card">
        <ProfileRow label="SKU" value={product.sku} />
        {product.barcode ? (
          <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5">
            <span className="shrink-0 text-xs text-muted-foreground">Código de barras</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-foreground">
              <Barcode aria-hidden className="size-3.5 text-muted-foreground" />
              {product.barcode}
            </span>
          </div>
        ) : null}
        <ProfileRow label="Marca" value={product.brand} />
        <ProfileRow label="Tipo" value={product.productType} />
        <ProfileRow label="Categoría" value={product.category} />
        <ProfileRow label="Proveedor" value={supplierLabel} />
      </ContactFormSection>

      <ContactFormSection title="Inventario" icon={Layers} className="bg-card">
        <ProfileRow
          label="Control de stock"
          value={product.trackInventory ? 'Sí' : 'No aplica'}
        />
        <ProfileRow label="Stock actual" value={product.stock} />
        {product.trackInventory ? (
          <>
            <ProfileRow label="Mínimo" value={product.minStock} />
            <ProfileRow label="Máximo" value={product.maxStock} />
          </>
        ) : null}
      </ContactFormSection>

      <ContactFormSection title="Comercial" icon={DollarSign} className="bg-card">
        <ProfileRow
          label="Precio de venta"
          value={formatProductPriceDisplay({
            price: product.price,
            unitOfMeasure: product.unitOfMeasure,
            customUnit: product.customUnit,
            billingPeriod: product.billingPeriod,
          })}
        />
        <ProfileRow label="Unidad de venta" value={uom} />
        <ProfileRow label="Periodo de cobro" value={product.billingPeriod} />
        <ProfileRow
          label="Impuesto"
          value={
            product.taxRate
              ? `${product.taxRate}%`
              : ''
          }
        />
      </ContactFormSection>

      {showMeasures ? (
        <ContactFormSection title="Medidas" icon={Ruler} className="bg-card">
          {hasDimensions ? (
            <ProfileRow
              label="Dimensiones (L × A × H)"
              value={`${product.dimensions.length || '—'} × ${product.dimensions.width || '—'} × ${product.dimensions.height || '—'} ${product.dimensions.unit}`}
            />
          ) : null}
          {product.weight ? (
            <ProfileRow label="Peso" value={`${product.weight} ${product.weightUnit}`} />
          ) : null}
          {product.requiresRefrigeration ? (
            <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50/80 px-3 py-2 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
              <Snowflake aria-hidden className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Refrigerado</p>
                {product.shelfLifeDays ? (
                  <p className="text-xs opacity-90">
                    Vida útil: {product.shelfLifeDays} días
                  </p>
                ) : null}
                {product.storageNotes ? (
                  <p className="mt-1 text-xs opacity-90">{product.storageNotes}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </ContactFormSection>
      ) : null}

      {product.licenseTerms ? (
        <ContactFormSection title="Licencia / servicio" icon={Box} className="bg-card">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {product.licenseTerms}
          </p>
        </ContactFormSection>
      ) : null}

      <ContactFormSection title="Rendimiento" icon={TrendingUp} className="bg-card">
        <ProfileRow label="Ingresos estimados" value={product.revenue} />
        <ProfileRow label="Unidades vendidas" value={String(product.unitsSold)} />
      </ContactFormSection>

      <ContactFormSection title="Responsable" icon={UserRound} className="bg-card">
        <div className="flex gap-3 pt-1">
          <UserRound aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Propietario del producto</p>
            <div className="mt-1.5 flex items-center gap-3">
              <Avatar className="size-8 shrink-0 border border-border">
                <AvatarFallback className="text-xs">{ownerInitials}</AvatarFallback>
              </Avatar>
              <p className="truncate text-sm font-medium text-foreground">
                {product.owner.trim() || '—'}
              </p>
            </div>
          </div>
        </div>
      </ContactFormSection>

      {product.description?.trim() || product.shortDescription?.trim() ? (
        <Card className="shadow-sm lg:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Descripción</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {product.description?.trim() ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            ) : null}
            {product.shortDescription?.trim() ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.shortDescription}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <RecordAuditMeta record={product} className="lg:col-span-2 xl:col-span-3" />
    </div>
  )
}
