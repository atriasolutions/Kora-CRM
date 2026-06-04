import {
  Briefcase,
  Building2,
  CalendarClock,
  ExternalLink,
  MapPin,
  Share2,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { ContactFormSection } from '@/components/contacts/ContactFormSection'
import { RecordAuditMeta } from '@/components/shared/RecordAuditMeta'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ContactDetail } from '@/data/contact-detail.mock'
import {
  formatTaxIdentifierDisplay,
  inferContactIdentifierType,
  taxIdentifierLabel,
} from '@/lib/tax-identifier'
import {
  outreachFilterStatusLabel,
  outreachResultLabel,
  resolveOutreachFilterStatus,
} from '@/lib/contact-outreach'
import { contactDisplayPhone, contactKindFromDetail } from '@/lib/contact-form'
import { getEmailHref } from '@/lib/email'
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

type ContactDetailProfileProps = {
  contact: ContactDetail
}

export function ContactDetailProfile({ contact }: ContactDetailProfileProps) {
  const ownerInitials = contact.owner.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
  const mobilePhone = contactDisplayPhone(contact)
  const emailHref = getEmailHref(contact.email)
  const contactKind = contactKindFromDetail(contact)
  const isB2B = contactKind === 'B2B'
  const identifierType = inferContactIdentifierType(contact.rut ?? '')
  const identifierDisplay = contact.rut
    ? formatTaxIdentifierDisplay(identifierType, contact.rut)
    : ''
  const outreachStatus = resolveOutreachFilterStatus(contact)

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <ContactFormSection title="Identificación" icon={UserRound} className="bg-card">
        <ProfileRow
          label="Tipo"
          value={contactKind === 'B2B' ? 'B2B — empresa' : 'B2C — persona'}
        />
        <ProfileRow
          label={taxIdentifierLabel(identifierType)}
          value={identifierDisplay}
        />
        <ProfileRow label="Estado" value={contact.status} />
        <ProfileRow
          label="Último intento"
          value={
            contact.lastOutreachLabel ??
            (outreachStatus === 'sin_contactar'
              ? ''
              : contact.lastContactLabel)
          }
        />
        {contact.lastOutreachResult ? (
          <ProfileRow
            label="Resultado"
            value={outreachResultLabel(contact.lastOutreachResult)}
          />
        ) : outreachStatus !== 'sin_contactar' ? (
          <ProfileRow
            label="Seguimiento"
            value={outreachFilterStatusLabel(outreachStatus)}
          />
        ) : null}
        <ProfileRow
          label="Email"
          value={contact.email}
          href={emailHref ?? undefined}
        />
        <ProfileRow
          label="Móvil / WhatsApp"
          value={mobilePhone}
          href={mobilePhone ? getTelHref(mobilePhone) ?? undefined : undefined}
        />
        <div className="flex gap-3 border-t border-border/60 pt-3">
          <UserRound aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Responsable</p>
            <div className="mt-1.5 flex items-center gap-3">
              <Avatar className="size-8 shrink-0 border border-border">
                {contact.owner.avatarUrl ? (
                  <AvatarImage src={contact.owner.avatarUrl} alt={contact.owner.name} />
                ) : null}
                <AvatarFallback className="text-xs">{ownerInitials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{contact.owner.name}</p>
                <p className="text-xs text-muted-foreground">Propietario del registro</p>
              </div>
            </div>
          </div>
        </div>
      </ContactFormSection>

      {isB2B ? (
      <ContactFormSection title="Empresa y cargo" icon={Briefcase} className="bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
          <span className="text-xs text-muted-foreground">Empresa</span>
          {contact.companyId ? (
            <Link
              to={`/empresas/${contact.companyId}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              {contact.company}
              <ExternalLink aria-hidden className="size-3" />
            </Link>
          ) : (
            <span className="text-sm font-medium">{contact.company || '—'}</span>
          )}
        </div>
        <ProfileRow label="Cargo" value={contact.role} />
      </ContactFormSection>
      ) : null}

      <ContactFormSection title="Ubicación" icon={MapPin} className="bg-card">
        <ProfileRow label="Dirección" value={contact.streetAddress ?? ''} />
        <ProfileRow label="Región" value={contact.region ?? ''} />
        <ProfileRow label="Comuna" value={contact.commune ?? contact.city ?? ''} />
        {contact.location ? (
          <p className="pt-1 text-xs text-muted-foreground">
            Vista resumida: {contact.location}
          </p>
        ) : null}
      </ContactFormSection>

      <ContactFormSection title="Presencia y origen" icon={Share2} className="bg-card">
        <ProfileRow
          label="LinkedIn"
          value={contact.linkedIn ?? ''}
          href={contact.linkedIn ? `https://${contact.linkedIn}` : undefined}
        />
        <ProfileRow label="Origen" value={contact.source} />
        <ProfileRow label="Zona horaria" value={contact.timezone} />
      </ContactFormSection>

      {isB2B && contact.companyId ? (
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold">Ficha de empresa</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" asChild>
              <Link to={`/empresas/${contact.companyId}`}>
                Ver ficha
                <ExternalLink aria-hidden className="ms-1 size-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Building2 aria-hidden className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-medium">{contact.companyDetail.name}</p>
                <p className="text-sm text-muted-foreground">
                  {contact.companyDetail.industry}
                </p>
              </div>
            </div>
            <ProfileRow
              label="Sitio web"
              value={contact.companyDetail.website}
              href={`https://${contact.companyDetail.website}`}
            />
            <ProfileRow
              label="Empleados (aprox.)"
              value={contact.companyDetail.employees}
            />
          </CardContent>
        </Card>
      ) : null}

      {contact.nextActivity ? (
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CalendarClock aria-hidden className="size-4 text-primary" />
              Próxima actividad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{contact.nextActivity.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {contact.nextActivity.when}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Lead score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2">
            <span className="text-3xl font-semibold tabular-nums">{contact.score}</span>
            <span className="pb-1 text-sm text-muted-foreground">/ 100</span>
          </div>
        </CardContent>
      </Card>

      <RecordAuditMeta record={contact} className="lg:col-span-2 xl:col-span-3" />
    </div>
  )
}
