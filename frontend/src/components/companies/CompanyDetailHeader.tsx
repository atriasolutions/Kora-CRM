import {
  Calendar,
  CalendarPlus,
  ChevronDown,
  Globe,
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
import type { CompanyDetail } from '@/data/company-detail.mock'
import type { ContactActivityType } from '@/data/contact-detail.mock'
import type { CompanyLifecycleStatus } from '@/data/companies.mock'
import type { CompanyDetailMetric } from '@/lib/company-detail-metrics'
import { companyEmailHref, companyWebsiteHref } from '@/lib/company-display'
import {
  formatTaxIdentifierDisplay,
  inferCompanyIdentifierType,
  taxIdentifierLabel,
} from '@/lib/tax-identifier'
import { initialsFromLabel } from '@/lib/image-upload'
import { useDetailHeaderPermissions } from '@/hooks/use-detail-header-permissions'
import { cn } from '@/lib/utils'

function lifecycleVariant(
  lifecycle: CompanyLifecycleStatus,
): 'customer' | 'prospect' | 'lead' | 'supplier' {
  switch (lifecycle) {
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

type CompanyDetailHeaderProps = {
  company: CompanyDetail
  metrics: CompanyDetailMetric[]
  onStartEdit?: () => void
  onRegisterActivity?: (presetType?: ContactActivityType) => void
  onArchive?: () => void
}

export function CompanyDetailHeader({
  company,
  metrics,
  onStartEdit,
  onRegisterActivity,
  onArchive,
}: CompanyDetailHeaderProps) {
  const { showEdit, showArchive } = useDetailHeaderPermissions('empresas', {
    onStartEdit,
    onArchive,
  })

  const websiteHref = companyWebsiteHref(company.website)
  const emailHref = companyEmailHref(company.email)
  const identifierType = inferCompanyIdentifierType(company.rut)
  const identifierDisplay = formatTaxIdentifierDisplay(identifierType, company.rut)
  const headquartersAddress = [
    company.headquarters?.street || company.headquartersStreet,
    company.headquarters?.commune ?? company.headquarters?.city ?? company.city,
    company.headquarters?.region,
  ]
    .filter(Boolean)
    .join(', ')

  const hasMeta =
    Boolean(company.rut) ||
    Boolean(headquartersAddress) ||
    Boolean(company.website) ||
    Boolean(company.email) ||
    Boolean(company.phone)

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-br from-muted/40 via-card to-card p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 gap-3 sm:gap-4">
            <Avatar className="size-14 shrink-0 rounded-xl border-2 border-border shadow-sm sm:size-16">
              <AvatarImage src={company.logoUrl} alt={company.name} />
              <AvatarFallback className="rounded-xl text-lg">
                {initialsFromLabel(company.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {company.name}
                </h1>
                <Badge variant={lifecycleVariant(company.lifecycle)}>
                  {company.lifecycle}
                </Badge>
                <Badge
                  variant={company.operationalStatus === 'Activa' ? 'customer' : 'muted'}
                >
                  {company.operationalStatus}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {[company.industry, company.city, company.employees && `${company.employees} empleados`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>

          <div
            className={cn(
              'flex flex-wrap items-center gap-2',
              'border-t border-border/60 pt-4 xl:shrink-0 xl:justify-end xl:border-t-0 xl:pt-0',
            )}
          >
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
            {showEdit ? (
              <Button
                variant="outline"
                size="sm"
                className="border-border shadow-sm"
                onClick={onStartEdit}
              >
                <Pencil aria-hidden className="size-4" />
                <span className="hidden md:inline">Editar empresa</span>
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="border-border shadow-sm">
                  <MoreHorizontal aria-hidden className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>Duplicar</DropdownMenuItem>
                {showArchive ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={onArchive}
                    >
                      Archivar
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {hasMeta ? (
          <DetailHeaderMetaPanel>
            {company.rut ? (
              <DetailHeaderMetaCell icon={IdCard} label={taxIdentifierLabel(identifierType)}>
                <span className="font-mono text-[13px]">{identifierDisplay}</span>
              </DetailHeaderMetaCell>
            ) : null}
            {headquartersAddress ? (
              <DetailHeaderMetaCell icon={MapPin} label="Dirección" fullWidth>
                {headquartersAddress}
              </DetailHeaderMetaCell>
            ) : null}
            {company.website ? (
              <DetailHeaderMetaCell icon={Globe} label="Sitio web">
                {websiteHref ? (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {company.website}
                  </a>
                ) : (
                  company.website
                )}
              </DetailHeaderMetaCell>
            ) : null}
            {company.email ? (
              <DetailHeaderMetaCell icon={Mail} label="Email">
                {emailHref ? (
                  <a
                    href={emailHref}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {company.email}
                  </a>
                ) : (
                  company.email
                )}
              </DetailHeaderMetaCell>
            ) : null}
            {company.phone ? (
              <DetailHeaderMetaCell icon={Phone} label="Teléfono">
                {company.phone}
              </DetailHeaderMetaCell>
            ) : null}
          </DetailHeaderMetaPanel>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-px bg-border/70 sm:grid-cols-4">
        {metrics.map(({ label, value }) => (
          <div key={label} className="bg-card px-4 py-4 sm:px-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
