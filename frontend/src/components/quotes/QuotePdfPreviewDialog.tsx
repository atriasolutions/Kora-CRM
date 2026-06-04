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
import type { CompanyListItem } from '@/data/companies.mock'
import type { QuoteDetail } from '@/data/quote-detail.mock'
import { getCompanyDetail } from '@/data/company-detail.mock'
import { getRegistryCompanyById } from '@/data/companies-registry-store'
import { useOrganizationSettings } from '@/hooks/use-organization-settings'
import { loadCompanyDetail } from '@/lib/entity-detail-loaders'
import type { CompanyAddressRecord } from '@/lib/company-location'
import {
  downloadQuotePdf,
  generateQuotePdf,
  type QuotePdfInput,
} from '@/lib/quote-pdf'
import { toast } from '@/lib/toast'

type QuotePdfPreviewDialogProps = {
  quote: QuoteDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuotePdfPreviewDialog({ quote, open, onOpenChange }: QuotePdfPreviewDialogProps) {
  const { settings: organization } = useOrganizationSettings()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [customerHeadquarters, setCustomerHeadquarters] = useState<
    CompanyAddressRecord | undefined
  >()
  const [customerCompany, setCustomerCompany] = useState<CompanyListItem | undefined>()

  useEffect(() => {
    if (!quote.companyId?.trim()) {
      setCustomerHeadquarters(undefined)
      setCustomerCompany(undefined)
      return
    }
    const companyId = quote.companyId.trim()
    if (isApiEnabled()) {
      void loadCompanyDetail(companyId)
        .then((detail) => {
          setCustomerHeadquarters(detail.headquarters)
          setCustomerCompany(detail)
        })
        .catch(() => {
          setCustomerHeadquarters(undefined)
          setCustomerCompany(getRegistryCompanyById(companyId))
        })
      return
    }
    const detail = getCompanyDetail(companyId)
    setCustomerHeadquarters(detail.headquarters)
    setCustomerCompany(detail)
  }, [quote.companyId])

  const pdfInput = useMemo(
    () => ({
      quote,
      organization,
      customerCompany:
        customerCompany ??
        (quote.companyId ? getRegistryCompanyById(quote.companyId) : undefined),
      customerHeadquarters,
    }),
    [quote, organization, customerCompany, customerHeadquarters],
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
        const blob = generateQuotePdf(pdfInput)
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          toast.error('No se pudo generar el PDF de la cotización.')
          setPreviewUrl(null)
        }
      } finally {
        if (!cancelled) setGenerating(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, pdfInput])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Vista previa PDF — {quote.code}</DialogTitle>
          <DialogDescription>
            Cliente desde la ficha de empresa; emisor desde Configuración.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-[50vh] bg-muted/30 p-4">
          {generating ? (
            <p className="py-20 text-center text-sm text-muted-foreground">Generando PDF…</p>
          ) : previewUrl ? (
            <iframe
              title={`Vista previa ${quote.code}`}
              src={previewUrl}
              className="h-[min(70vh,640px)] w-full rounded-lg border border-border bg-white"
            />
          ) : (
            <p className="py-20 text-center text-sm text-muted-foreground">
              No se pudo generar la vista previa.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 border-t border-border px-6 py-4 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            type="button"
            disabled={generating}
            onClick={() => {
              try {
                downloadQuotePdf(pdfInput)
              } catch (err) {
                console.error(err)
                toast.error('No se pudo descargar el PDF.')
              }
            }}
          >
            <FileDown aria-hidden className="size-4" />
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
