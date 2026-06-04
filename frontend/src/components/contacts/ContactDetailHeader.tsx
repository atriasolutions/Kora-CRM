import {
  Building2,
  ClipboardCheck,
  Calendar,
  CalendarPlus,
  ChevronDown,
  IdCard,
  Mail,
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

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-br from-muted/40 via-card to-card p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
            <Avatar className="size-16 shrink-0 border-2 border-background shadow-md sm:size-20">
              <AvatarImage src={contact.avatarUrl} alt={contact.name} />
              <AvatarFallback className="text-lg">
                {initials(contact.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {contact.name}
                </h1>
                <Badge variant={statusVariant(contact.status)}>{contact.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{contact.role}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {contact.rut ? (
                  <span className="inline-flex items-center gap-1.5">
                    <IdCard aria-hidden className="size-4 shrink-0 opacity-70" />
                    {taxIdentifierLabel(identifierType)} {identifierDisplay}
                  </span>
                ) : null}
                {contact.rut ? (
                  <span className="hidden text-border sm:inline">·</span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Building2 aria-hidden className="size-4 shrink-0 opacity-70" />
                  {contact.companyId ? (
                    <Link
                      to={`/empresas/${contact.companyId}`}
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {contact.company}
                    </Link>
                  ) : (
                    contact.company
                  )}
                </span>
                {locationParts.length > 0 ? (
                  <>
                    <span className="hidden text-border sm:inline">·</span>
                    <span>{locationParts.join(', ')}</span>
                  </>
                ) : contact.location ? (
                  <>
                    <span className="hidden text-border sm:inline">·</span>
                    <span>{contact.location}</span>
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {emailHref ? (
                  <a
                    href={emailHref}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <Mail aria-hidden className="size-3.5" />
                    {contact.email}
                  </a>
                ) : contact.email ? (
                  <span className="inline-flex items-center gap-1">
                    <Mail aria-hidden className="size-3.5" />
                    {contact.email}
                  </span>
                ) : null}
                {displayPhone ? (
                <a
                  href={telHref ?? undefined}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                    <Phone aria-hidden className="size-3.5" />
                    {displayPhone}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/60 pt-4 2xl:w-auto 2xl:shrink-0 2xl:justify-end 2xl:border-t-0 2xl:pt-0">
              {telHref ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border shadow-sm"
                  asChild
                >
                  <a href={telHref}>
                    <Phone aria-hidden className="size-4" />
                    Llamar
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
                  Llamar
                </Button>
              )}
              {emailHref ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border shadow-sm"
                  asChild
                >
                  <a href={emailHref}>
                    <Mail aria-hidden className="size-4" />
                    Email
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
                  Email
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border shadow-sm"
                disabled={!displayPhone}
                title={
                  displayPhone
                    ? 'Abrir chat de WhatsApp'
                    : 'Sin número de móvil / WhatsApp'
                }
                onClick={() => {
                  if (displayPhone) openWhatsAppChat(displayPhone)
                }}
              >
                <MessageCircle aria-hidden className="size-4" />
                WhatsApp
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
                  Registrar intento
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
                  Editar contacto
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="border-border shadow-sm">
                    <MoreHorizontal aria-hidden className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onSelect={() => {
                      onDuplicate?.()
                    }}
                  >
                    Duplicar
                  </DropdownMenuItem>
                  {canArchive ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => {
                          onArchive?.()
                        }}
                      >
                        Archivar
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-e-none shadow-sm"
                  onClick={() => onRegisterActivity?.()}
                >
                  <CalendarPlus aria-hidden className="size-4" />
                  Registrar actividad
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
