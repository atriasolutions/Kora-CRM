import { useEffect, useMemo, useState } from 'react'
import { PageScrollArea } from '@/components/layout/PageScrollArea'
import { useSearchParams } from 'react-router-dom'

import { OrganizationSettingsPanel } from '@/components/settings/OrganizationSettingsPanel'
import { ProductCategoriesSettingsPanel } from '@/components/settings/ProductCategoriesSettingsPanel'
import { TaxCurrencySettingsPanel } from '@/components/settings/TaxCurrencySettingsPanel'
import { SettingsNav } from '@/components/settings/SettingsNav'
import {
  DEFAULT_SETTINGS_SECTION,
  settingsSectionById,
  SettingsOverviewIcon,
  type SettingsSectionId,
} from '@/components/settings/settings-sections'
import { WarehousesSettingsPanel } from '@/components/settings/WarehousesSettingsPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function SettingsSectionPanel({ sectionId }: { sectionId: SettingsSectionId }) {
  switch (sectionId) {
    case 'empresa':
      return <OrganizationSettingsPanel />
    case 'bodegas':
      return <WarehousesSettingsPanel />
    case 'categorias':
      return <ProductCategoriesSettingsPanel />
    case 'impuestos':
      return <TaxCurrencySettingsPanel />
    default:
      return null
  }
}

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paramSection = searchParams.get('seccion') as SettingsSectionId | null

  const initialSection = useMemo(() => {
    const section = paramSection ? settingsSectionById(paramSection) : undefined
    return section?.id ?? DEFAULT_SETTINGS_SECTION
  }, [paramSection])

  const [activeSection, setActiveSection] = useState<SettingsSectionId>(initialSection)

  useEffect(() => {
    setActiveSection(initialSection)
  }, [initialSection])

  const activeMeta = settingsSectionById(activeSection) ?? settingsSectionById('empresa')!

  const selectSection = (id: SettingsSectionId) => {
    setActiveSection(id)
    setSearchParams({ seccion: id }, { replace: true })
  }

  return (
    <PageScrollArea className="space-y-6 p-4 pb-10 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <SettingsOverviewIcon aria-hidden className="size-3.5" />
            Administración
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Configuración</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Parámetros globales del CRM: empresa, inventario, catálogo y preferencias del sistema.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(240px,280px)_1fr] lg:items-start">
        <Card className="shadow-sm lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Secciones</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsNav activeId={activeSection} onSelect={selectSection} />
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <p className="text-sm font-medium text-foreground">{activeMeta.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{activeMeta.description}</p>
          </div>

          <SettingsSectionPanel sectionId={activeSection} />
        </div>
      </div>
    </PageScrollArea>
  )
}
