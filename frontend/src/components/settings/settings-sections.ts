import {
  Building2,
  FileDigit,
  Layers,
  Receipt,
  SlidersHorizontal,
  Warehouse,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react'

export type SettingsSectionId =
  | 'empresa'
  | 'facturacion-sii'
  | 'bodegas'
  | 'categorias'
  | 'impuestos'
  | 'solicitudes'

export type SettingsSection = {
  id: SettingsSectionId
  label: string
  description: string
  Icon: LucideIcon
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'empresa',
    label: 'Empresa emisora',
    description: 'Razón social, logo y datos para PDF de cotizaciones y compras.',
    Icon: Building2,
  },
  {
    id: 'facturacion-sii',
    label: 'Facturación electrónica',
    description: 'Modo manual o integración con el SII (certificado, folios y RCV).',
    Icon: FileDigit,
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
    id: 'solicitudes',
    label: 'Solicitudes',
    description: 'Responsable predeterminado al crear nuevas solicitudes.',
    Icon: ClipboardList,
  },
]

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = 'empresa'

export function settingsSectionById(id: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((s) => s.id === id)
}

export const SettingsOverviewIcon = SlidersHorizontal
