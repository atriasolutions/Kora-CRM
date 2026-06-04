import {
  Calendar,
  CalendarPlus,
  ChevronDown,
  Globe,
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

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <Avatar className="size-14 shrink-0 rounded-xl border-2 border-border shadow-sm sm:size-16">
            <AvatarImage src={company.logoUrl} alt={company.name} />
            <AvatarFallback className="rounded-xl text-lg">
              {initialsFromLabel(company.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">
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
            <p className="text-sm text-muted-foreground">
              {company.industry} · {company.city} · {company.employees} empleados
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {taxIdentifierLabel(identifierType)} {identifierDisplay}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/60 pt-4 2xl:w-auto 2xl:shrink-0 2xl:border-t-0 2xl:pt-0">
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
          {showEdit ? (
            <Button
              variant="outline"
              size="sm"
              className="border-border shadow-sm"
              onClick={onStartEdit}
            >
              <Pencil aria-hidden className="size-4" />
              Editar empresa
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

      <div className="mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-muted/20 px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        {websiteHref ? (
          <a
            href={websiteHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-1.5 underline-offset-2 hover:text-primary hover:underline',
            )}
          >
            <Globe aria-hidden className="size-4 shrink-0" />
            {company.website}
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Globe aria-hidden className="size-4" />
            {company.website}
          </span>
        )}
        {emailHref ? (
          <a
            href={emailHref}
            className="inline-flex items-center gap-1.5 underline-offset-2 hover:text-primary hover:underline"
          >
            <Mail aria-hidden className="size-4 shrink-0" />
            {company.email}
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Mail aria-hidden className="size-4" />
            {company.email}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Phone aria-hidden className="size-4" />
          {company.phone}
        </span>
      </div>
    </section>
  )
}
