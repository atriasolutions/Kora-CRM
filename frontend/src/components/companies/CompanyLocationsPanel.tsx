import { Building2, ExternalLink, MapPin, Pencil, Plus, Store, Trash2 } from 'lucide-react'
import { useState } from 'react'

import {
  CompanyLocationEntryDialog,
  type LocationEntryKind,
} from '@/components/companies/CompanyLocationEntryDialog'
import { CompanyLocationMap } from '@/components/companies/CompanyLocationMap'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CompanyDetail } from '@/data/company-detail.mock'
import type {
  CompanyAddressRecord,
  CompanyBranchRecord,
} from '@/lib/company-location'
import {
  formatAddressLine,
  resolveMapExternalUrl,
} from '@/lib/company-location'
import {
  formatTaxIdentifierDisplay,
  inferCompanyIdentifierType,
  taxIdentifierLabel,
} from '@/lib/tax-identifier'

type CompanyLocationsPanelProps = {
  company: CompanyDetail
  onCompanyChange: (company: CompanyDetail) => void
}

type DialogState =
  | { kind: LocationEntryKind; entry?: CompanyBranchRecord | CompanyAddressRecord }
  | null

export function CompanyLocationsPanel({
  company,
  onCompanyChange,
}: CompanyLocationsPanelProps) {
  const hq = company.headquarters
  const [dialog, setDialog] = useState<DialogState>(null)

  const persist = (patch: Pick<CompanyDetail, 'branches' | 'addresses'>) => {
    onCompanyChange({ ...company, ...patch })
  }

  const openCreate = (kind: LocationEntryKind) => {
    setDialog({ kind })
  }

  const openEdit = (
    kind: LocationEntryKind,
    entry: CompanyBranchRecord | CompanyAddressRecord,
  ) => {
    setDialog({ kind, entry })
  }

  const removeBranch = (id: string) => {
    persist({
      branches: company.branches.filter((b) => b.id !== id),
      addresses: company.addresses,
    })
  }

  const removeAddress = (id: string) => {
    persist({
      branches: company.branches,
      addresses: company.addresses.filter((a) => a.id !== id),
    })
  }

  const handleSave = (entry: CompanyBranchRecord | CompanyAddressRecord) => {
    if (!dialog) return
    if (dialog.kind === 'branch') {
      const branch = entry as CompanyBranchRecord
      const exists = company.branches.some((b) => b.id === branch.id)
      persist({
        branches: exists
          ? company.branches.map((b) => (b.id === branch.id ? branch : b))
          : [...company.branches, branch],
        addresses: company.addresses,
      })
    } else {
      const addr = entry as CompanyAddressRecord
      const exists = company.addresses.some((a) => a.id === addr.id)
      persist({
        branches: company.branches,
        addresses: exists
          ? company.addresses.map((a) => (a.id === addr.id ? addr : a))
          : [...company.addresses, addr],
      })
    }
  }

  return (
    <div className="space-y-5">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Building2 aria-hidden className="size-4 text-primary" />
            Identificación fiscal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {taxIdentifierLabel(inferCompanyIdentifierType(company.rut))} / identificador
            tributario
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-wide text-foreground">
            {formatTaxIdentifierDisplay(
              inferCompanyIdentifierType(company.rut),
              company.rut,
            )}
          </p>
        </CardContent>
      </Card>

      <CompanyLocationMap
        title="Casa matriz"
        street={hq.street}
        city={hq.city}
        commune={hq.commune}
        region={hq.region}
        country={hq.country}
        postalCode={hq.postalCode}
        lat={hq.lat}
        lng={hq.lng}
      />
      <p className="text-xs text-muted-foreground">
        La casa matriz se edita desde el formulario principal de la empresa (botón Editar).
      </p>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Store aria-hidden className="size-4 text-primary" />
            Sucursales
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{company.branches.length}</Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={() => openCreate('branch')}
            >
              <Plus aria-hidden className="size-3.5" />
              Agregar sucursal
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {company.branches.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              No hay sucursales registradas. Usa «Agregar sucursal» para añadir puntos de
              atención o despacho.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {company.branches.map((branch) => {
                const line = formatAddressLine({
                  street: branch.street,
                  commune: branch.commune,
                  city: branch.city,
                  region: branch.region,
                  postalCode: branch.postalCode,
                  country: branch.country,
                })
                const mapsUrl = resolveMapExternalUrl(
                  {
                    street: branch.street,
                    commune: branch.commune,
                    city: branch.city,
                    region: branch.region,
                    postalCode: branch.postalCode,
                    country: branch.country,
                  },
                  branch.lat,
                  branch.lng,
                )

                return (
                  <div
                    key={branch.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{branch.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{line}</p>
                      {branch.phone ? (
                        <p className="mt-1 text-xs text-muted-foreground">{branch.phone}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => openEdit('branch', branch)}
                      >
                        <Pencil aria-hidden className="size-3.5" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => removeBranch(branch.id)}
                      >
                        <Trash2 aria-hidden className="size-3.5" />
                        Quitar
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 shrink-0 border-border" asChild>
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink aria-hidden className="size-4" />
                          Ver en mapa
                        </a>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <MapPin aria-hidden className="size-4 text-primary" />
            Otras direcciones
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            onClick={() => openCreate('address')}
          >
            <Plus aria-hidden className="size-3.5" />
            Agregar dirección
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {company.addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay direcciones adicionales. Puedes registrar facturación, bodegas u otros
              puntos distintos de la casa matriz.
            </p>
          ) : (
            company.addresses.map((addr) => (
              <div
                key={addr.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{addr.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatAddressLine({
                      street: addr.street,
                      commune: addr.commune,
                      city: addr.city,
                      region: addr.region,
                      country: addr.country,
                      postalCode: addr.postalCode,
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => openEdit('address', addr)}
                  >
                    <Pencil aria-hidden className="size-3.5" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={() => removeAddress(addr.id)}
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                    Quitar
                  </Button>
                  <Button variant="ghost" size="sm" className="shrink-0" asChild>
                    <a
                      href={resolveMapExternalUrl(
                        {
                          street: addr.street,
                          commune: addr.commune,
                          city: addr.city,
                          region: addr.region,
                          postalCode: addr.postalCode,
                          country: addr.country,
                        },
                        addr.lat,
                        addr.lng,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir mapa
                    </a>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {dialog ? (
        <CompanyLocationEntryDialog
          open
          onOpenChange={(open) => {
            if (!open) setDialog(null)
          }}
          kind={dialog.kind}
          defaultCity={company.city}
          initial={dialog.entry}
          onSave={handleSave}
        />
      ) : null}
    </div>
  )
}
