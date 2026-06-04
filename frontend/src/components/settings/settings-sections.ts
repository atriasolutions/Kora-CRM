import {
  Building2,
  Layers,
  Receipt,
  SlidersHorizontal,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'

export type SettingsSectionId =
  | 'empresa'
  | 'bodegas'
  | 'categorias'
  | 'impuestos'
  | 'usuarios'

export type SettingsSection = {
  id: SettingsSectionId
  label: string
  description: string
  Icon: LucideIcon
  /** Sección visible pero sin panel implementado aún */
  comingSoon?: boolean
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'empresa',
    label: 'Empresa emisora',
    description: 'Razón social, logo y datos para PDF de cotizaciones y compras.',
    Icon: Building2,
  },
  {
    id: 'bodegas',
    label: 'Bodegas',
    description: 'Ubicaciones de inventario y almacenamiento.',
    Icon: Warehouse,
  },
  {
    id: 'categorias',
    label: 'Categorías de productos',
    description: 'Clasificación del catálogo comercial.',
    Icon: Layers,
  },
  {
    id: 'impuestos',
    label: 'Impuestos y moneda',
    description: 'Indicadores UF, USD y EUR, e IVA por defecto del sistema.',
    Icon: Receipt,
  },
  {
    id: 'usuarios',
    label: 'Usuarios y permisos',
    description: 'Equipos, roles y acceso a módulos.',
    Icon: Users,
    comingSoon: true,
  },
]

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = 'empresa'

export function settingsSectionById(id: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((s) => s.id === id)
}

export const SettingsOverviewIcon = SlidersHorizontal
