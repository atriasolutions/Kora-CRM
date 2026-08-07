import {
  Building2,
  FileDigit,
  Gauge,
  Landmark,
  Layers,
  Receipt,
  Server,
  Shield,
  SlidersHorizontal,
  Warehouse,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react'

export type SettingsSectionId =
  | 'empresa'
  | 'datos-bancarios'
  | 'facturacion-sii'
  | 'bodegas'
  | 'categorias'
  | 'impuestos'
  | 'solicitudes'
  | 'privacidad'
  | 'informacion-instancia'
  | 'instancia'

export type SettingsSection = {
  id: SettingsSectionId
  label: string
  description: string
  Icon: LucideIcon
  /** Visible pero no seleccionable (p. ej. integración en desarrollo). */
  comingSoon?: boolean
  /** Solo operador de plataforma (superadmin). */
  platformOperatorOnly?: boolean
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
    label: 'Direcciones de despacho',
    description: 'Ubicaciones de origen y destino para entregas, stock y documentos.',
    Icon: Warehouse,
  },
  {
    id: 'datos-bancarios',
    label: 'Datos bancarios',
    description: 'Cuentas para transferencias y PDF de cotizaciones.',
    Icon: Landmark,
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
  {
    id: 'privacidad',
    label: 'Privacidad y datos',
    description:
      'Guía Art. 14 ter, canal ARSOPB, bitácora de derechos e incidentes (Ley 21.719). No certifica cumplimiento por sí sola.',
    Icon: Shield,
  },
  {
    id: 'facturacion-sii',
    label: 'Facturación electrónica',
    description: 'Modo manual o integración con el SII (certificado, folios y RCV).',
    Icon: FileDigit,
    platformOperatorOnly: true,
  },
  {
    id: 'informacion-instancia',
    label: 'Información de la instancia',
    description: 'Uso de usuarios, registros y archivos vs. límites contratados.',
    Icon: Gauge,
  },
  {
    id: 'instancia',
    label: 'Instancia',
    description: 'Límites de usuarios, capacidad y operaciones críticas de esta instancia.',
    Icon: Server,
    platformOperatorOnly: true,
  },
]

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = 'empresa'

export function settingsSectionById(id: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((s) => s.id === id)
}

export const SettingsOverviewIcon = SlidersHorizontal
