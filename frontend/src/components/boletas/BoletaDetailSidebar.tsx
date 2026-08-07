import {
  ContactFormDateInput,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExchangeRatesPanel } from '@/components/shared/ExchangeRatesPanel'
import { Separator } from '@/components/ui/separator'
import type { BoletaDetail } from '@/data/boleta-detail.mock'
import type { BoletaPaymentMethod } from '@/data/boletas.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import { SaleCustomerFields } from '@/components/shared/SaleCustomerFields'
import { BOLETA_PAYMENT_METHOD_OPTIONS, type BoletaFormValues } from '@/lib/boleta-form'
import { Link } from 'react-router-dom'
import { boletaObservationText } from '@/lib/boleta-display'

type BoletaDetailSidebarProps = {
  boleta: BoletaDetail
  isEditing?: boolean
  form?: BoletaFormValues
  onFormChange?: (patch: Partial<BoletaFormValues>) => void
}

export function BoletaDetailSidebar({
  boleta,
  isEditing = false,
  form,
  onFormChange,
}: BoletaDetailSidebarProps) {
  const patch = (partial: Partial<BoletaFormValues>) => {
    onFormChange?.(partial)
  }

  if (isEditing && form) {
    return (
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="border-primary/20 shadow-sm ring-1 ring-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Cobro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ContactFormDateInput
              id="edit-bol-sidebar-issue"
              label="Fecha de emisión"
              value={form.issueDate}
              onChange={(issueDate) => patch({ issueDate })}
            />
            <ContactFormSelect
              id="edit-bol-sidebar-payment"
              label="Medio de pago"
              value={form.paymentMethod}
              onChange={(paymentMethod) =>
                patch({ paymentMethod: paymentMethod as BoletaPaymentMethod })
              }
              options={BOLETA_PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m, label: m }))}
            />
            <UserLookupField
              label="Responsable"
              value={form.ownerName}
              onChange={(ownerName) => patch({ ownerName })}
            />
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-sm ring-1 ring-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Comprador vinculado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Vínculo CRM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Comprador: </span>
            <span className="font-medium">{boleta.buyerName}</span>
          </p>
          {boleta.buyerTaxId ? (
            <p>
              <span className="text-muted-foreground">RUT: </span>
              {boleta.buyerTaxId}
            </p>
          ) : null}
          {boleta.contactId ? (
            <p>
              <span className="text-muted-foreground">Contacto: </span>
              <Link
                to={`/contactos/${boleta.contactId}`}
                className="font-medium text-primary hover:underline"
              >
                {boleta.contactName ?? 'Ver contacto'}
              </Link>
            </p>
          ) : null}
          {boleta.companyId ? (
            <p>
              <span className="text-muted-foreground">Empresa: </span>
              <Link
                to={`/empresas/${boleta.companyId}`}
                className="font-medium text-primary hover:underline"
              >
                {boleta.companyName ?? 'Ver ficha'}
              </Link>
            </p>
          ) : null}
          <Separator />
          <p>
            <span className="text-muted-foreground">Responsable: </span>
            <span className="font-medium">{boleta.owner}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Emisión: </span>
            <span className="font-medium">{boleta.issueDate}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Medio de pago: </span>
            <span className="font-medium">{boleta.paymentMethod}</span>
          </p>
          {boletaObservationText(boleta.internalNotes) ? (
            <>
              <Separator />
              <ContactFormInput
                id="bol-internal-notes"
                label="Notas internas"
                value={boletaObservationText(boleta.internalNotes)}
                disabled
                onChange={() => {}}
              />
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Totales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Subtotal líneas: </span>
            {boleta.subtotal}
          </p>
          {boleta.globalDiscount &&
          boleta.globalDiscount !== '0' &&
          boleta.globalDiscount !== '0%' ? (
            <p>
              <span className="text-muted-foreground">
                Descuento global ({boleta.globalDiscount})
              </span>
            </p>
          ) : null}
          <p>
            <span className="text-muted-foreground">IVA ({boleta.taxPercent}): </span>
            {boleta.taxAmount}
          </p>
          <p>
            <span className="text-muted-foreground">Total: </span>
            <span className="font-semibold">{boleta.amount}</span>
          </p>
          {boleta.exchangeRateDate ? (
            <ExchangeRatesPanel
              date={boleta.exchangeRateDate}
              uf={boleta.exchangeRateUf}
              usd={boleta.exchangeRateUsd}
              eur={boleta.exchangeRateEur}
              className="mt-3 border-0 bg-muted/30 shadow-none"
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
