import {
  Building2,
  ClipboardCheck,
  Calendar,
  CalendarPlus,
  ChevronDown,
  IdCard,
  Mail,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  StickyNote,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  DetailHeaderMetaCell,
  DetailHeaderMetaPanel,
} from '@/components/shared/DetailHeaderMetaPanel'
import type { ContactDetail } from '@/data/contact-detail.mock'
import { contactDisplayPhone } from '@/lib/contact-form'
import { getEmailHref } from '@/lib/email'
import { getTelHref } from '@/lib/phone'
import { openWhatsAppChat } from '@/lib/whatsapp'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import type { ContactLifecycleStatus } from '@/data/contacts.mock'
import {
  formatTaxIdentifierDisplay,
  inferContactIdentifierType,
  taxIdentifierLabel,
} from '@/lib/tax-identifier'
import { Link } from 'react-router-dom'
import { useDetailHeaderPermissions } from '@/hooks/use-detail-header-permissions'
import { cn } from '@/lib/utils'

function statusVariant(
  status: ContactLifecycleStatus,
): 'customer' | 'prospect' | 'lead' | 'supplier' {
  switch (status) {
    case 'Cliente':
      return 'customer'
    case 'Prospecto':
      return 'prospect'
    case 'Proveedor':
      return 'supplier'
    default:
      return 'prospect'
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

type ContactDetailHeaderProps = {
  contact: ContactDetail
  onStartEdit?: () => void
  onRegisterActivity?: (presetType?: ContactActivityType) => void
  onLogOutreach?: () => void
  onDuplicate?: () => void
  onArchive?: () => void
}

export function ContactDetailHeader({
  contact,
  onStartEdit,
  onRegisterActivity,
  onLogOutreach,
  onDuplicate,
  onArchive,
}: ContactDetailHeaderProps) {
  const { showEdit: canEdit, showArchive: canArchive } = useDetailHeaderPermissions(
    'contactos',
    { onStartEdit, onArchive },
  )

  const metrics = [
    {
      label: 'Último contacto',
      value: contact.lastContactLabel.split('·')[0]?.trim() ?? contact.lastContactLabel,
      hint: contact.lastContactLabel.includes('·')
        ? contact.lastContactLabel.split('·').slice(1).join('·').trim()
        : undefined,
    },
    { label: 'Pipeline', value: contact.pipelineValue },
    {
      label: 'Actividades pendientes',
      value: String(contact.pendingActivities),
    },
    { label: 'Lead score', value: `${contact.score}/100` },
  ]

  const displayPhone = contactDisplayPhone(contact)
  const telHref = displayPhone ? getTelHref(displayPhone) : null
  const emailHref = getEmailHref(contact.email)
  const identifierType = inferContactIdentifierType(contact.rut ?? '')
  const identifierDisplay = contact.rut
    ? formatTaxIdentifierDisplay(identifierType, contact.rut)
    : ''

  const locationParts = [
    contact.streetAddress,
    contact.commune ?? contact.city,
    contact.region,
  ].filter(Boolean)
  const locationText =
    locationParts.length > 0 ? locationParts.join(', ') : contact.location?.trim()

  const hasMeta =
    Boolean(contact.rut) ||
    Boolean(contact.company) ||
    Boolean(locationText) ||
    Boolean(contact.email) ||
    Boolean(displayPhone)

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-br from-muted/40 via-card to-card p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 gap-3 sm:gap-4">
            <Avatar className="size-16 shrink-0 border-2 border-background shadow-md sm:size-20">
              <AvatarImage src={contact.avatarUrl} alt={contact.name} />
              <AvatarFallback className="text-lg">{initials(contact.name)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {contact.name}
                </h1>
                <Badge variant={statusVariant(contact.status)}>{contact.status}</Badge>
              </div>
              {contact.role ? (
                <p className="mt-1 text-sm text-muted-foreground">{contact.role}</p>
              ) : null}
            </div>
          </div>

          <div
            className={cn(
              'flex flex-wrap items-center gap-2',
              'border-t border-border/60 pt-4 xl:max-w-[42rem] xl:shrink-0 xl:justify-end xl:border-t-0 xl:pt-0',
            )}
          >
            {telHref ? (
              <Button variant="outline" size="sm" className="border-border shadow-sm" asChild>
                <a href={telHref}>
                  <Phone aria-hidden className="size-4" />
                  <span className="hidden sm:inline">Llamar</span>
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border shadow-sm"
                disabled
                title="Sin número de teléfono"
              >
                <Phone aria-hidden className="size-4" />
                <span className="hidden sm:inline">Llamar</span>
              </Button>
            )}
            {emailHref ? (
              <Button variant="outline" size="sm" className="border-border shadow-sm" asChild>
                <a href={emailHref}>
                  <Mail aria-hidden className="size-4" />
                  <span className="hidden sm:inline">Email</span>
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border shadow-sm"
                disabled
                title="Sin email de contacto"
              >
                <Mail aria-hidden className="size-4" />
                <span className="hidden sm:inline">Email</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border shadow-sm"
              disabled={!displayPhone}
              title={
                displayPhone ? 'Abrir chat de WhatsApp' : 'Sin número de móvil / WhatsApp'
              }
              onClick={() => {
                if (displayPhone) openWhatsAppChat(displayPhone)
              }}
            >
              <MessageCircle aria-hidden className="size-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            {onLogOutreach ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border shadow-sm"
                onClick={onLogOutreach}
              >
                <ClipboardCheck aria-hidden className="size-4" />
                <span className="hidden md:inline">Registrar intento</span>
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border shadow-sm"
                onClick={onStartEdit}
              >
                <Pencil aria-hidden className="size-4" />
                <span className="hidden md:inline">Editar contacto</span>
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="border-border shadow-sm">
                  <MoreHorizontal aria-hidden className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => onDuplicate?.()}>Duplicar</DropdownMenuItem>
                {canArchive ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => onArchive?.()}
                    >
                      Archivar
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex w-full sm:w-auto">
              <Button
                type="button"
                size="sm"
                className="min-w-0 flex-1 rounded-e-none shadow-sm sm:flex-none"
                onClick={() => onRegisterActivity?.()}
              >
                <CalendarPlus aria-hidden className="size-4 shrink-0" />
                <span className="truncate">Registrar actividad</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-s-none border-s-0 px-2 shadow-sm"
                    aria-label="Tipo de actividad rápida"
                  >
                    <ChevronDown aria-hidden className="size-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => onRegisterActivity?.('llamada')}>
                    <Phone aria-hidden className="size-4" />
                    Llamada
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRegisterActivity?.('email')}>
                    <Mail aria-hidden className="size-4" />
                    Email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRegisterActivity?.('reunion')}>
                    <Calendar aria-hidden className="size-4" />
                    Reunión
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRegisterActivity?.('whatsapp')}>
                    <MessageCircle aria-hidden className="size-4" />
                    WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRegisterActivity?.('nota')}>
                    <StickyNote aria-hidden className="size-4" />
                    Nota
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {hasMeta ? (
          <DetailHeaderMetaPanel>
            {contact.rut ? (
              <DetailHeaderMetaCell icon={IdCard} label={taxIdentifierLabel(identifierType)}>
                <span className="font-mono text-[13px]">{identifierDisplay}</span>
              </DetailHeaderMetaCell>
            ) : null}
            {contact.company ? (
              <DetailHeaderMetaCell icon={Building2} label="Empresa">
                {contact.companyId ? (
                  <Link
                    to={`/empresas/${contact.companyId}`}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {contact.company}
                  </Link>
                ) : (
                  contact.company
                )}
              </DetailHeaderMetaCell>
            ) : null}
            {locationText ? (
              <DetailHeaderMetaCell icon={MapPin} label="Dirección" fullWidth>
                {locationText}
              </DetailHeaderMetaCell>
            ) : null}
            {contact.email ? (
              <DetailHeaderMetaCell icon={Mail} label="Email">
                {emailHref ? (
                  <a
                    href={emailHref}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {contact.email}
                  </a>
                ) : (
                  contact.email
                )}
              </DetailHeaderMetaCell>
            ) : null}
            {displayPhone ? (
              <DetailHeaderMetaCell icon={Phone} label="Teléfono">
                <a href={telHref ?? undefined} className="hover:underline">
                  {displayPhone}
                </a>
              </DetailHeaderMetaCell>
            ) : null}
          </DetailHeaderMetaPanel>
        ) : null}
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
        {metrics.map((metric) => (
          <div key={metric.label} className="px-4 py-4 sm:px-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {metric.value}
            </p>
            {metric.hint ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{metric.hint}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
