import type { ModuleListConfig } from '@/types/list-module'
import type { ListRowBase } from '@/types/list-module'

import { activitiesListConfig } from './activities'
import { companiesListConfig } from './companies'
import { contactsListConfig } from './contacts'
import { invoicingListConfig } from './invoicing'
import { opportunitiesListConfig } from './opportunities'
import { quotesListConfig } from './quotes'
import { productsListConfig } from './products'
import { projectsListConfig } from './projects'
import { reportsListConfig } from './reports'
import { settingsListConfig } from './settings'
import { usersListConfig } from './users'

export type ListModuleSlug =
  | 'contactos'
  | 'empresas'
  | 'oportunidades'
  | 'cotizaciones'
  | 'actividades'
  | 'proyectos'
  | 'facturacion'
  | 'productos'
  | 'reportes'
  | 'usuarios'
  | 'configuracion'

function asBaseConfig<T extends ListRowBase>(
  config: ModuleListConfig<T>,
): ModuleListConfig<ListRowBase> {
  return config as unknown as ModuleListConfig<ListRowBase>
}

export const listModuleSlugs: ListModuleSlug[] = [
  'contactos',
  'empresas',
  'oportunidades',
  'cotizaciones',
  'actividades',
  'proyectos',
  'facturacion',
  'productos',
  'reportes',
  'usuarios',
  'configuracion',
]

export function getListModuleConfig(
  slug: ListModuleSlug,
): ModuleListConfig<ListRowBase> {
  switch (slug) {
    case 'contactos':
      return asBaseConfig(contactsListConfig)
    case 'empresas':
      return asBaseConfig(companiesListConfig)
    case 'oportunidades':
      return asBaseConfig(opportunitiesListConfig)
    case 'cotizaciones':
      return asBaseConfig(quotesListConfig)
    case 'actividades':
      return asBaseConfig(activitiesListConfig)
    case 'proyectos':
      return asBaseConfig(projectsListConfig)
    case 'facturacion':
      return asBaseConfig(invoicingListConfig)
    case 'productos':
      return asBaseConfig(productsListConfig)
    case 'reportes':
      return asBaseConfig(reportsListConfig)
    case 'usuarios':
      return asBaseConfig(usersListConfig)
    case 'configuracion':
      return asBaseConfig(settingsListConfig)
  }
}
