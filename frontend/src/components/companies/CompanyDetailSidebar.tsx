import { Building2, MapPin, UserRound } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { ContactFormSection } from '@/components/contacts/ContactFormSection'
import { RecordAuditMeta } from '@/components/shared/RecordAuditMeta'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CompanyDetail } from '@/data/company-detail.mock'
import { useContactsRegistry } from '@/hooks/use-contacts-registry'
import { contactsForCompany } from '@/lib/company-contacts'
import {
  companyEmailHref,
  companyWebsiteHref,
  formatCompanyEmployeesLabel,
} from '@/lib/company-display'
import { companyDetailToFormValues } from '@/lib/company-form'
import {
  formatTaxIdentifierDisplay,
  taxIdentifierLabel,
} from '@/lib/tax-identifier'
import { initialsFromLabel } from '@/lib/image-upload'
import { getTelHref } from '@/lib/phone'

function ProfileRow({
  label,
  value,
  href,
}: {
  label: string
  value: string
  href?: string
}) {
  const display = value.trim() || '—'
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      {href && value.trim() ? (
        <a
          href={href}
          className="min-w-0 truncate text-end text-sm font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
          target={href.startsWith('mailto:') || href.startsWith('tel:') ? undefined : '_blank'}
          rel={
            href.startsWith('mailto:') || href.startsWith('tel:')
              ? undefined
              : 'noopener noreferrer'
          }
        >
          {display}
        </a>
      ) : (
        <span className="min-w-0 truncate text-end text-sm font-medium text-foreground">
          {display}
        </span>
      )}
    </div>
  )
}

type CompanyDetailSidebarProps = {
  company: CompanyDetail
}

export function CompanyDetailSidebar({ company }: CompanyDetailSidebarProps) {
  const values = companyDetailToFormValues(company)
  const ownerInitials = initialsFromLabel(values.ownerName || company.owner)
  const { allContacts } = useContactsRegistry()
  const linkedContacts = useMemo(
    () => contactsForCompany(allContacts, { id: company.id, name: company.name }),
    [allContacts, company.id, company.name],
  )

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <ContactFormSection title="Identificación" icon={Building2} className="bg-card">
        <ProfileRow label="Nombre de la empresa" value={values.name} />
        <ProfileRow
          label={`${taxIdentifierLabel(values.identifierType)} / ID fiscal`}
          value={
            values.rut
              ? formatTaxIdentifierDisplay(values.identifierType, values.rut)
              : ''
          }
        />
        <ProfileRow label="Industria" value={values.industry} />
        <ProfileRow
          label="Empleados"
          value={formatCompanyEmployeesLabel(values.employees)}
        />
        <div className="pt-1">
          <p className="text-xs text-muted-foreground">Descripción</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            {values.description.trim() || '—'}
          </p>
        </div>
      </ContactFormSection>

      <ContactFormSection title="Ubicación" icon={MapPin} className="bg-card">
        <ProfileRow label="Dirección casa matriz" value={values.headquartersStreet} />
        <ProfileRow label="Región" value={values.headquartersRegion} />
        <ProfileRow label="Comuna" value={values.headquartersCommune} />
        <ProfileRow label="Ciudad" value={values.city} />
        <ProfileRow label="País" value={values.headquartersCountry} />
        <ProfileRow label="Código postal" value={values.headquartersPostalCode} />
        <ProfileRow
          label="Sucursales"
          value={
            company.branches.length > 0
              ? `${company.branches.length} registrada${company.branches.length === 1 ? '' : 's'}`
              : 'Ninguna'
          }
        />
      </ContactFormSection>

      <ContactFormSection title="Contacto y responsable" icon={Building2} className="bg-card">
        <ProfileRow
          label="Sitio web"
          value={values.website}
          href={companyWebsiteHref(values.website)}
        />
        <ProfileRow
          label="Email"
          value={values.email}
          href={companyEmailHref(values.email)}
        />
        <ProfileRow
          label="Teléfono"
          value={values.phone}
          href={values.phone.trim() ? getTelHref(values.phone) ?? undefined : undefined}
        />
        <div className="flex gap-3 pt-1">
          <UserRound aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Responsable</p>
            <div className="mt-1.5 flex items-center gap-3">
              <Avatar className="size-8 shrink-0 border border-border">
                {company.ownerDetail.avatarUrl ? (
                  <AvatarImage
                    src={company.ownerDetail.avatarUrl}
                    alt={values.ownerName}
                  />
                ) : null}
                <AvatarFallback className="text-xs">{ownerInitials}</AvatarFallback>
              </Avatar>
              <p className="truncate text-sm font-medium text-foreground">
                {values.ownerName.trim() || '—'}
              </p>
            </div>
          </div>
        </div>
      </ContactFormSection>

      {linkedContacts.length > 0 ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Contactos vinculados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {linkedContacts.map((c) => (
              <div key={c.id} className="rounded-lg border border-border px-3 py-2">
                <Link
                  to={`/contactos/${c.id}`}
                  className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  {c.name}
                </Link>
                <p className="text-xs text-muted-foreground">{c.role}</p>
                {c.email ? (
                  <a
                    href={`mailto:${c.email}`}
                    className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                  >
                    {c.email}
                  </a>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <RecordAuditMeta record={company} className="lg:col-span-2 xl:col-span-3" />
    </div>
  )
}
