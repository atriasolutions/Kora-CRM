import { FileDigit } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { InvoiceDetail } from '@/data/invoice-detail.mock'
import {
  formatSiiInvoiceNumberDisplay,
  INVOICE_EMITTED_STATUS,
  invoiceRequiresSiiNumber,
} from '@/lib/invoice-sii'

type InvoiceSiiFolioCardProps = {
  invoice: Pick<InvoiceDetail, 'status' | 'siiNumber' | 'number'>
}

export function InvoiceSiiFolioCard({ invoice }: InvoiceSiiFolioCardProps) {
  const hasFolio = Boolean(invoice.siiNumber?.trim())
  const isDraft = invoice.status === 'Borrador'

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <FileDigit aria-hidden className="size-4 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">Folio SII (DTE)</CardTitle>
        </div>
        {hasFolio ? (
          <Badge variant="secondary" className="shrink-0 font-normal">
            Registrado
          </Badge>
        ) : invoiceRequiresSiiNumber(invoice.status) ? (
          <Badge variant="destructive" className="shrink-0 font-normal">
            Pendiente
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {hasFolio ? (
          <p>
            Folio tributario:{' '}
            <span className="font-mono font-medium text-foreground">
              {formatSiiInvoiceNumberDisplay(invoice.siiNumber!)}
            </span>
          </p>
        ) : isDraft ? (
          <p>
            Aún no hay folio. Al hacer clic en <strong className="text-foreground">Emitida</strong>{' '}
            en la ruta del éxito se abrirá un formulario para ingresar el número del documento
            emitido en el SII.
          </p>
        ) : invoice.status === INVOICE_EMITTED_STATUS ? (
          <p>
            Esta factura está emitida pero no tiene folio SII registrado. Edítala o vuelve a
            «Borrador» y avanza de nuevo a Emitida para registrarlo.
          </p>
        ) : (
          <p>
            El folio SII se solicita al pasar la factura a estado emitida en la ruta del éxito.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
