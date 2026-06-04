import { FileDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isApiEnabled } from '@/api/config'
import type { PurchaseDetail } from '@/data/purchase-detail.mock'
import { getCompanyDetail } from '@/data/company-detail.mock'
import { getRegistryCompanyById } from '@/data/companies-registry-store'
import { useOrganizationSettings } from '@/hooks/use-organization-settings'
import { loadCompanyDetail } from '@/lib/entity-detail-loaders'
import type { CompanyAddressRecord } from '@/lib/company-location'
import {
  downloadPurchaseOrderPdf,
  generatePurchaseOrderPdf,
  type PurchaseOrderPdfInput,
} from '@/lib/purchase-order-pdf'

type PurchaseOrderPdfPreviewDialogProps = {
  purchase: PurchaseDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

function buildPdfInput(
  purchase: PurchaseDetail,
  organization: PurchaseOrderPdfInput['organization'],
  supplierHeadquarters?: CompanyAddressRecord,
): PurchaseOrderPdfInput {
  return {
    purchase,
    organization,
    supplierCompany: purchase.supplierId
      ? getRegistryCompanyById(purchase.supplierId)
      : undefined,
    supplierHeadquarters,
  }
}

export function PurchaseOrderPdfPreviewDialog({
  purchase,
  open,
  onOpenChange,
}: PurchaseOrderPdfPreviewDialogProps) {
  const { settings: organization } = useOrganizationSettings()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [supplierHeadquarters, setSupplierHeadquarters] = useState<
    CompanyAddressRecord | undefined
  >()

  useEffect(() => {
    if (!purchase.supplierId?.trim()) {
      setSupplierHeadquarters(undefined)
      return
    }
    const supplierId = purchase.supplierId.trim()
    if (isApiEnabled()) {
      void loadCompanyDetail(supplierId)
        .then((detail) => setSupplierHeadquarters(detail.headquarters))
        .catch(() => setSupplierHeadquarters(undefined))
      return
    }
    setSupplierHeadquarters(getCompanyDetail(supplierId).headquarters)
  }, [purchase.supplierId])

  const pdfInput = useMemo(
    () => buildPdfInput(purchase, organization, supplierHeadquarters),
    [purchase, organization, supplierHeadquarters],
  )

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return null
        })
        setGenerating(false)
      })
      return
    }

    let cancelled = false
    queueMicrotask(() => {
      setGenerating(true)
      try {
        const blob = generatePurchaseOrderPdf(pdfInput)
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
      } finally {
        if (!cancelled) setGenerating(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, pdfInput])

  useEffect(() => {
    return () => {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [])

  const handleDownload = () => {
    downloadPurchaseOrderPdf(pdfInput)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="truncate pe-8">
            Orden de compra — {purchase.reference}
          </DialogTitle>
          <DialogDescription>
            Vista previa del PDF. Emisor desde configuración; proveedor desde la ficha de
            empresa; entrega en bodega desde la OC.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden bg-muted/30 p-4">
          {generating ? (
            <div className="flex h-[min(75vh,720px)] items-center justify-center rounded-md border border-border bg-white">
              <p className="text-sm text-muted-foreground">Generando vista previa…</p>
            </div>
          ) : previewUrl ? (
            <iframe
              title={`Vista previa OC ${purchase.reference}`}
              src={previewUrl}
              className="h-[min(75vh,720px)] w-full rounded-md border border-border bg-white"
            />
          ) : (
            <div className="flex h-[min(75vh,720px)] items-center justify-center rounded-md border border-dashed border-border bg-white">
              <p className="text-sm text-muted-foreground">No se pudo generar la vista previa.</p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            type="button"
            disabled={generating || !previewUrl}
            onClick={handleDownload}
          >
            <FileDown aria-hidden className="size-4" />
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
