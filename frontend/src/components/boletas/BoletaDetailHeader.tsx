import { MoreHorizontal, Pencil, Printer, Receipt } from 'lucide-react'

import {
  ContactFormInput,
} from '@/components/contacts/ContactFormField'
import { SaleCustomerFields } from '@/components/shared/SaleCustomerFields'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { BoletaDetail } from '@/data/boleta-detail.mock'
import { boletaListStatusLabel, boletaStatusVariant } from '@/lib/boleta-display'
import type { BoletaFormValues } from '@/lib/boleta-form'
import { RegisterActivityHeaderButton } from '@/components/shared/RegisterActivityHeaderButton'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import { useDetailHeaderPermissions } from '@/hooks/use-detail-header-permissions'
import { cn } from '@/lib/utils'

type BoletaDetailHeaderProps = {
  boleta: BoletaDetail
  isEditing?: boolean
  form?: BoletaFormValues
  onFormChange?: (patch: Partial<BoletaFormValues>) => void
  onStartEdit?: () => void
  onRegisterActivity?: (presetType?: ContactActivityType) => void
  onArchive?: () => void
  onPrint?: () => void
  printing?: boolean
}

export function BoletaDetailHeader({
  boleta,
  isEditing = false,
  form,
  onFormChange,
  onStartEdit,
  onRegisterActivity,
  onArchive,
  onPrint,
  printing = false,
}: BoletaDetailHeaderProps) {
  const { showEdit, showArchive } = useDetailHeaderPermissions('boletas', {
    onStartEdit,
    onArchive,
  })

  const displayBuyer = isEditing && form ? form.buyerName || boleta.buyerName : boleta.buyerName
  const displayAmount = isEditing && form ? form.amount : boleta.amount

  const metrics = [
    { label: 'Total', value: displayAmount },
    { label: 'Subtotal', value: boleta.subtotal },
    { label: 'IVA', value: boleta.taxAmount },
    { label: 'Emisión', value: isEditing && form ? form.issueDate : boleta.issueDate },
    { label: 'Medio de pago', value: isEditing && form ? form.paymentMethod : boleta.paymentMethod },
  ]

  const patch = (partial: Partial<BoletaFormValues>) => {
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
            <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-gradient-to-br from-primary/10 to-chart-3/10 sm:size-16">
              <Receipt aria-hidden className="size-7 text-primary sm:size-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-mono text-lg font-semibold tracking-tight sm:text-xl">
                  {boleta.number}
                </h1>
                <Badge variant={boletaStatusVariant(boleta.status)}>
                  {boletaListStatusLabel(boleta)}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{displayBuyer}</p>
              {boleta.buyerTaxId ? (
                <p className="text-xs text-muted-foreground">RUT: {boleta.buyerTaxId}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onPrint && boleta.status === 'Emitida' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrint}
                disabled={printing}
              >
                <Printer aria-hidden className="me-2 size-4" />
                {printing ? 'Generando…' : 'Imprimir comprobante'}
              </Button>
            ) : null}
            {onRegisterActivity ? (
              <RegisterActivityHeaderButton onClick={() => onRegisterActivity('nota')} />
            ) : null}
            {(showEdit || showArchive) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="size-8 px-0">
                    <MoreHorizontal aria-hidden className="size-4" />
                    <span className="sr-only">Acciones</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {showEdit ? (
                    <DropdownMenuItem onSelect={onStartEdit}>
                      <Pencil aria-hidden className="me-2 size-4" />
                      Editar
                    </DropdownMenuItem>
                  ) : null}
                  {showEdit && showArchive ? <DropdownMenuSeparator /> : null}
                  {showArchive ? (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={onArchive}
                    >
                      Archivar
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </div>

      {isEditing && form ? (
        <div className="space-y-4 border-t border-border p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <ContactFormInput
              id="header-bol-buyer"
              label="Nombre comprador"
              value={form.buyerName}
              onChange={(buyerName) => patch({ buyerName })}
            />
            <ContactFormInput
              id="header-bol-tax"
              label="RUT comprador"
              value={form.buyerTaxId}
              onChange={(buyerTaxId) => patch({ buyerTaxId })}
            />
          </div>
          <SaleCustomerFields
            values={{
              customerKind: form.customerKind,
              contactId: form.contactId,
              contactName: form.contactName,
              companyId: form.companyId,
              companyName: form.companyName,
            }}
            onChange={(customerPatch) => patch(customerPatch)}
          />
        </div>
      ) : null}
    </section>
  )
}
