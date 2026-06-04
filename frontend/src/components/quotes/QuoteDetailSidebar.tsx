import { CreditCard, MapPin, Truck, UserRound } from 'lucide-react'

import {
  ContactFormDateInput,
  ContactFormField,
  ContactFormInput,
  ContactFormSelect,
} from '@/components/contacts/ContactFormField'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { QuoteDetail } from '@/data/quote-detail.mock'
import { UserLookupField } from '@/components/shared/UserLookupField'
import { QuoteCommercialTermsFields } from '@/components/quotes/QuoteCommercialTermsFields'
import type { QuoteFormValues } from '@/lib/quote-form'

type QuoteDetailSidebarProps = {
  quote: QuoteDetail
  isEditing?: boolean
  form?: QuoteFormValues
  onFormChange?: (patch: Partial<QuoteFormValues>) => void
}

export function QuoteDetailSidebar({
  quote,
  isEditing = false,
  form,
  onFormChange,
}: QuoteDetailSidebarProps) {
  const patch = (partial: Partial<QuoteFormValues>) => {
    onFormChange?.(partial)
  }

  if (isEditing && form) {
    return (
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="border-primary/20 shadow-sm ring-1 ring-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Datos de la cotización</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ContactFormDateInput
              id="edit-qt-valid"
              label="Válida hasta"
              value={form.validUntil}
              onChange={(validUntil) => patch({ validUntil })}
            />
            <UserLookupField
              label="Responsable"
              value={form.ownerName}
              onChange={(ownerName) => patch({ ownerName })}
            />
            <ContactFormInput
              id="edit-qt-opp"
              label="Oportunidad"
              value={form.opportunityName}
              onChange={(opportunityName) => patch({ opportunityName })}
            />
            <ContactFormInput
              id="edit-qt-company"
              label="Empresa"
              value={form.companyName}
              onChange={(companyName) => patch({ companyName })}
            />
            <ContactFormInput
              id="edit-qt-contact"
              label="Contacto"
              value={form.contactName}
              onChange={(contactName) => patch({ contactName })}
            />
            <ContactFormInput
              id="edit-qt-email"
              label="Email contacto"
              inputVariant="email"
              value={form.contactEmail}
              onChange={(contactEmail) => patch({ contactEmail })}
            />
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-sm ring-1 ring-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Condiciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuoteCommercialTermsFields
              idPrefix="sidebar-qt"
              values={{
                paymentTerms: form.paymentTerms,
                deliveryTerms: form.deliveryTerms,
                terms: form.terms,
              }}
              onChange={(patch) => onFormChange?.(patch)}
            />
            <ContactFormInput
              id="edit-qt-billing"
              label="Dirección facturación"
              value={form.billingAddress}
              onChange={(billingAddress) => patch({ billingAddress })}
            />
            <p className="text-xs font-medium text-muted-foreground sm:col-span-2">
              Bodega destino: {form.destinationWarehouse || '—'}
            </p>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Dirección de entrega: {form.deliveryAddress || '—'}
            </p>
            <ContactFormField id="edit-qt-internal" label="Notas internas">
              <textarea
                id="edit-qt-internal"
                rows={3}
                value={form.internalNotes}
                onChange={(e) => patch({ internalNotes: e.target.value })}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </ContactFormField>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Cliente y contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Empresa: </span>
            <span className="font-medium">{quote.companyName}</span>
          </p>
          <p className="flex items-center gap-2">
            <UserRound aria-hidden className="size-4 text-muted-foreground" />
            <span>
              {quote.contactName} · {quote.contactEmail}
            </span>
          </p>
          <Separator />
          <p>
            <span className="text-muted-foreground">Oportunidad: </span>
            <span className="font-medium">{quote.opportunityName}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Responsable: </span>
            <span className="font-medium">{quote.owner}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Condiciones comerciales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="flex gap-2">
            <CreditCard aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="text-muted-foreground">Pago: </span>
              {quote.paymentTerms?.trim() || '—'}
            </span>
          </p>
          <p className="flex gap-2">
            <Truck aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="text-muted-foreground">Entrega: </span>
              {quote.deliveryTerms?.trim() || '—'}
            </span>
          </p>
          <p className="flex gap-2">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="text-muted-foreground">Facturación: </span>
              {quote.billingAddress}
            </span>
          </p>
          <p className="flex gap-2">
            <Truck aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="text-muted-foreground">Bodega destino: </span>
              {quote.destinationWarehouse || '—'}
            </span>
          </p>
          <p className="flex gap-2">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="text-muted-foreground">Dirección de entrega: </span>
              {quote.deliveryAddress || '—'}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Notas internas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">{quote.internalNotes}</p>
        </CardContent>
      </Card>
    </div>
  )
}
