import { FileDigit } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InvoiceDetail } from '@/data/invoice-detail.mock'
import {
  dteTypeLabel,
  documentKindLabel,
  previewDteBreakdown,
  resolvePreviewInvoiceDteType,
} from '@/lib/invoice-dte'
import {
  formatSiiInvoiceNumberDisplay,
  INVOICE_EMITTED_STATUS,
  invoiceRequiresSiiNumber,
} from '@/lib/invoice-sii'

type InvoiceSiiFolioCardProps = {
  invoice: Pick<
    InvoiceDetail,
    | 'status'
    | 'siiNumber'
    | 'number'
    | 'dteType'
    | 'dteStatus'
    | 'siiTrackId'
    | 'documentKind'
    | 'lineItems'
    | 'globalDiscount'
    | 'discountPercent'
    | 'taxableSubtotal'
    | 'exemptSubtotal'
    | 'taxAmount'
  >
  invoicingMode?: 'manual' | 'sii'
  onEmitToSii?: () => void
  emittingSii?: boolean
}

export function InvoiceSiiFolioCard({
  invoice,
  invoicingMode = 'manual',
  onEmitToSii,
  emittingSii,
}: InvoiceSiiFolioCardProps) {
  const hasFolio = Boolean(invoice.siiNumber?.trim())
  const isDraft = invoice.status === 'Borrador'
  const previewDte =
    invoice.dteType ??
    (invoice.documentKind === 'credit_note'
      ? 61
      : invoice.documentKind === 'debit_note'
        ? 56
        : resolvePreviewInvoiceDteType(invoice.lineItems ?? []))
  const draftBreakdown =
    isDraft && !hasFolio && invoice.lineItems?.length
      ? previewDteBreakdown(invoice.lineItems, {
          globalDiscountPercent: invoice.globalDiscount ?? invoice.discountPercent,
        })
      : null

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <FileDigit aria-hidden className="size-4 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">Folio SII (DTE)</CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="shrink-0 font-normal">
            {documentKindLabel(invoice.documentKind)}
          </Badge>
          <Badge variant="outline" className="shrink-0 font-normal">
            {dteTypeLabel(previewDte, invoice.documentKind)}
          </Badge>
          {hasFolio ? (
            <Badge variant="secondary" className="shrink-0 font-normal">
              Registrado
            </Badge>
          ) : invoiceRequiresSiiNumber(invoice.status) || (isDraft && invoicingMode === 'sii') ? (
            <Badge variant="destructive" className="shrink-0 font-normal">
              Pendiente
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {hasFolio ? (
          <p>
            Folio tributario:{' '}
            <span className="font-mono font-medium text-foreground">
              {formatSiiInvoiceNumberDisplay(invoice.siiNumber!)}
            </span>
            {invoice.siiTrackId ? (
              <span className="block text-xs">Track SII: {invoice.siiTrackId}</span>
            ) : null}
            {invoice.dteStatus ? (
              <span className="block text-xs">Estado DTE: {invoice.dteStatus}</span>
            ) : null}
          </p>
        ) : isDraft ? (
          invoicingMode === 'sii' ? (
            <div className="space-y-3">
              {draftBreakdown ? (
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-foreground">
                  <p>
                    Neto afecto:{' '}
                    <span className="font-medium">{draftBreakdown.taxableSubtotal}</span>
                  </p>
                  {draftBreakdown.exemptSubtotal !== '$0' ? (
                    <p>
                      Neto exento:{' '}
                      <span className="font-medium">{draftBreakdown.exemptSubtotal}</span>
                    </p>
                  ) : null}
                  <p>
                    IVA: <span className="font-medium">{draftBreakdown.taxAmount}</span>
                  </p>
                  <p>
                    Total: <span className="font-semibold">{draftBreakdown.amount}</span>
                  </p>
                </div>
              ) : null}
              <p>
                En modo SII integrado, usa el botón para timbrar y enviar el DTE al Servicio de
                Impuestos Internos.
              </p>
              {onEmitToSii ? (
                <Button type="button" size="sm" onClick={onEmitToSii} disabled={emittingSii}>
                  {emittingSii ? 'Emitiendo al SII…' : 'Emitir al SII'}
                </Button>
              ) : null}
            </div>
          ) : (
            <p>
              Aún no hay folio. Al hacer clic en <strong className="text-foreground">Emitida</strong>{' '}
              en la ruta del éxito se abrirá un formulario para ingresar el número del documento
              emitido en el SII.
            </p>
          )
        ) : invoice.status === INVOICE_EMITTED_STATUS ? (
          <p>
            Este documento está emitido pero no tiene folio SII registrado. Edítalo o vuelve a
            «Borrador» y avanza de nuevo a Emitida para registrarlo.
          </p>
        ) : (
          <p>
            El folio SII se solicita al pasar el documento a estado emitida en la ruta del éxito.
          </p>
        )}
        {hasFolio && (invoice.taxableSubtotal || invoice.exemptSubtotal || invoice.taxAmount) ? (
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-foreground">
            {invoice.taxableSubtotal ? (
              <p>
                Neto afecto: <span className="font-medium">{invoice.taxableSubtotal}</span>
              </p>
            ) : null}
            {invoice.exemptSubtotal && invoice.exemptSubtotal !== '$0' ? (
              <p>
                Neto exento: <span className="font-medium">{invoice.exemptSubtotal}</span>
              </p>
            ) : null}
            {invoice.taxAmount ? (
              <p>
                IVA: <span className="font-medium">{invoice.taxAmount}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
