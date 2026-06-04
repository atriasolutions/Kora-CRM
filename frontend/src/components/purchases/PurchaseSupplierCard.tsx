import {
  Building2,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import { purchaseJourneyStageVariant } from '@/lib/purchase-journey'
import { cn } from '@/lib/utils'

type PurchaseSupplierCardProps = {
  purchase: PurchaseDetail
  className?: string
}

export function PurchaseSupplierCard({ purchase, className }: PurchaseSupplierCardProps) {
  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Building2 aria-hidden className="size-4 text-primary" />
          Proveedor
        </CardTitle>
        <Badge variant={purchaseJourneyStageVariant(purchase.stage)}>{purchase.stage}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          {purchase.supplierId ? (
            <Link
              to={`/empresas/${purchase.supplierId}`}
              className="group inline-flex items-center gap-1.5 text-lg font-semibold text-foreground hover:text-primary"
            >
              {purchase.supplier}
              <ExternalLink
                aria-hidden
                className="size-4 opacity-0 transition-opacity group-hover:opacity-100"
              />
            </Link>
          ) : (
            <p className="text-lg font-semibold text-foreground">{purchase.supplier}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">{purchase.paymentTerms}</p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-2.5">
            <UserRound aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-xs text-muted-foreground">Contacto</dt>
              <dd className="text-sm font-medium">{purchase.supplierContact || '—'}</dd>
            </div>
          </div>
          <div className="flex gap-2.5">
            <Mail aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="text-sm font-medium break-all">
                {purchase.supplierEmail ? (
                  <a href={`mailto:${purchase.supplierEmail}`} className="text-primary hover:underline">
                    {purchase.supplierEmail}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
          </div>
          <div className="flex gap-2.5">
            <Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-xs text-muted-foreground">Teléfono</dt>
              <dd className="text-sm font-medium">{purchase.supplierPhone || '—'}</dd>
            </div>
          </div>
          <div className="flex gap-2.5">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="text-xs text-muted-foreground">Entrega estimada</dt>
              <dd className="text-sm font-medium">{purchase.expectedDelivery || '—'}</dd>
            </div>
          </div>
        </dl>

        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm">
          <p className="text-xs text-muted-foreground">Destino</p>
          <p className="font-medium text-foreground">{purchase.warehouse || '—'}</p>
          <p className="mt-0.5 text-muted-foreground">
            {purchase.deliveryAddress || '—'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
