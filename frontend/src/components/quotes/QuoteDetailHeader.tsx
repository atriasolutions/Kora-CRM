import {
  Building2,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  Pencil,
  Target,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailRecordHeaderShell,
  detailRecordTitleClassName,
} from '@/components/shared/DetailRecordHeaderShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { QuoteDetail } from '@/data/quote-detail.mock'
import type { QuoteStatus } from '@/data/quotes.mock'
import { canInvoiceFromQuote } from '@/lib/invoice-create'
import { quoteStatusVariant } from '@/lib/quote-display'
import { QUOTE_STATUS_OPTIONS, type QuoteFormValues } from '@/lib/quote-form'
import { useDetailHeaderPermissions } from '@/hooks/use-detail-header-permissions'

type QuoteDetailHeaderProps = {
  quote: QuoteDetail
  isEditing?: boolean
  form?: QuoteFormValues
  onFormChange?: (patch: Partial<QuoteFormValues>) => void
  onStartEdit?: () => void
  onArchive?: () => void
  onPdfPreview?: () => void
  onCreateInvoice?: () => void
  onSyncOpportunity?: () => void
  syncOpportunityLoading?: boolean
  invoiceCount?: number
}

export function QuoteDetailHeader({
  quote,
  isEditing = false,
  form,
  onFormChange,
  onStartEdit,
  onArchive,
  onPdfPreview,
  onCreateInvoice,
  onSyncOpportunity,
  syncOpportunityLoading = false,
  invoiceCount = 0,
}: QuoteDetailHeaderProps) {
  const { showEdit, showArchive } = useDetailHeaderPermissions('cotizaciones', {
    onStartEdit,
    onArchive,
  })

  const editing = isEditing && form
  const canInvoice = canInvoiceFromQuote(quote)
  const metrics = [
    { label: 'Total', value: quote.amount },
    { label: 'Subtotal', value: quote.subtotal },
    { label: 'Líneas', value: String(quote.lineItems.length) },
    { label: 'Válida hasta', value: quote.validUntil },
    { label: 'Versión', value: quote.version },
    { label: 'Emisión', value: quote.issueDate },
  ]

  const displayTitle = editing ? form.title : quote.title
  const displayStatus = editing ? form.status : quote.status

  const patch = (partial: Partial<QuoteFormValues>) => {
    onFormChange?.(partial)
  }

  return (
    <DetailRecordHeaderShell
      editing={Boolean(editing)}
      media={
        <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-gradient-to-br from-primary/10 to-chart-2/10 sm:size-14 lg:size-16">
          <FileSpreadsheet aria-hidden className="size-6 text-primary sm:size-7 lg:size-8" />
        </div>
      }
      body={
        editing && form ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <ContactFormSelect
              id="qt-header-status"
              label="Estado"
              value={form.status}
              onChange={(status) => patch({ status: status as QuoteStatus })}
              options={QUOTE_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            />
            <ContactFormInput
              id="qt-header-title"
              label="Título"
              value={form.title}
              className="sm:col-span-2"
              onChange={(title) => patch({ title })}
            />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start gap-2">
              <h1 className={detailRecordTitleClassName()}>{displayTitle}</h1>
              <Badge variant={quoteStatusVariant(displayStatus)} className="shrink-0">
                {displayStatus}
              </Badge>
            </div>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
              <Link
                to={`/oportunidades/${quote.opportunityId}`}
                className="inline-flex min-w-0 items-center gap-1 break-words text-primary hover:underline"
              >
                <Target aria-hidden className="size-4 shrink-0" />
                <span className="min-w-0 break-words">{quote.opportunityName}</span>
              </Link>
              {quote.customerKind === 'contacto' && quote.contactId ? (
                <Link
                  to={`/contactos/${quote.contactId}`}
                  className="inline-flex min-w-0 items-center gap-1 break-words hover:text-primary hover:underline"
                >
                  <UserRound aria-hidden className="size-4 shrink-0" />
                  <span className="min-w-0 break-words">{quote.contactName}</span>
                </Link>
              ) : quote.companyId ? (
                <Link
                  to={`/empresas/${quote.companyId}`}
                  className="inline-flex min-w-0 items-center gap-1 break-words hover:text-primary hover:underline"
                >
                  <Building2 aria-hidden className="size-4 shrink-0" />
                  <span className="min-w-0 break-words">{quote.companyName}</span>
                </Link>
              ) : (
                <span className="inline-flex min-w-0 items-center gap-1 break-words">
                  <Building2 aria-hidden className="size-4 shrink-0" />
                  <span className="min-w-0 break-words">{quote.companyName}</span>
                </span>
              )}
            </div>
          </>
        )
      }
      actions={
        !editing ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="border-border shadow-sm"
              onClick={onPdfPreview}
            >
              <Download aria-hidden className="size-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-border shadow-sm"
              disabled={!canInvoice}
              title={
                canInvoice
                  ? 'Generar factura desde esta cotización'
                  : 'Disponible cuando la cotización esté Aceptada'
              }
              onClick={onCreateInvoice}
            >
              <FileText aria-hidden className="size-4" />
              Factura
              {invoiceCount > 0 ? ` (${invoiceCount})` : ''}
            </Button>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="border-border shadow-sm">
                  <MoreHorizontal aria-hidden className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onSyncOpportunity && quote.opportunityId?.trim() ? (
                  <DropdownMenuItem
                    disabled={syncOpportunityLoading}
                    onClick={onSyncOpportunity}
                  >
                    {syncOpportunityLoading
                      ? 'Sincronizando con oportunidad…'
                      : 'Sincronizar con oportunidad'}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem>Duplicar cotización</DropdownMenuItem>
                {showArchive ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={onArchive}>
                      Archivar
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : undefined
      }
      metrics={
        <DetailMetricsGrid>
          {metrics.map(({ label, value }) => (
            <DetailMetricCard key={label} label={label} value={value} />
          ))}
        </DetailMetricsGrid>
      }
      footer={
        !editing && quote.sentAt ? (
          <p className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground sm:text-sm">
            <Calendar aria-hidden className="size-4 shrink-0" />
            Enviada el {quote.sentAt} · Responsable: {quote.owner}
          </p>
        ) : undefined
      }
    />
  )
}
