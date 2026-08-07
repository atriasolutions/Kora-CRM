import {
  BarChart3,
  Boxes,
  Building2,
  Contact,
  Home,
  ListTodo,
  Settings,
  Shield,
  Target,
  FileSpreadsheet,
  Receipt,
  UsersRound,
  ShoppingCart,
  ArrowDownToLine,
  Wallet,
  Warehouse,
  Puzzle,
  ClipboardList,
  Clock,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react'

import type { MenuModuleId } from '@/lib/menu-modules'
import { DASHBOARD_PATH } from '@/lib/app-routes'

export type NavItemDef = {
  label: string
  path: string
  icon: LucideIcon
  moduleId: MenuModuleId
  end?: boolean
}

export type NavSectionDef =
  | { type: 'items'; items: NavItemDef[] }
  | {
      type: 'group'
      heading: string
      items: NavItemDef[]
      /** Abierto al cargar si no hay ruta activa en el grupo. */
      defaultOpen?: boolean
    }

/** Rutas coherentes con el sidebar; la bienvenida autenticada es `/inicio`. */
export const navSections: NavSectionDef[] = [
  {
    type: 'items',
    items: [
      {
        label: 'Dashboard',
        path: DASHBOARD_PATH,
        icon: Home,
        moduleId: 'dashboard',
        end: true,
      },
    ],
  },
  {
    type: 'group',
    heading: 'Ventas',
    defaultOpen: true,
    items: [
      { label: 'Contactos', path: '/contactos', icon: Contact, moduleId: 'contactos' },
      { label: 'Empresas', path: '/empresas', icon: Building2, moduleId: 'empresas' },
      { label: 'Oportunidades', path: '/oportunidades', icon: Target, moduleId: 'oportunidades' },
      { label: 'Cotizaciones', path: '/cotizaciones', icon: FileSpreadsheet, moduleId: 'cotizaciones' },
      { label: 'Facturación', path: '/facturacion', icon: Wallet, moduleId: 'facturacion' },
      { label: 'Boletas', path: '/boletas', icon: Receipt, moduleId: 'boletas' },
    ],
  },
  {
    type: 'group',
    heading: 'Operaciones',
    defaultOpen: true,
    items: [
      { label: 'Actividades', path: '/actividades', icon: ListTodo, moduleId: 'actividades' },
      { label: 'Proyectos', path: '/proyectos', icon: Puzzle, moduleId: 'proyectos' },
      { label: 'Solicitudes', path: '/solicitudes', icon: ClipboardList, moduleId: 'solicitudes' },
      { label: 'Pruebas de Solicitud', path: '/pruebas-solicitud', icon: ClipboardCheck, moduleId: 'pruebas_solicitud' },
      { label: 'Bitácora', path: '/bitacora', icon: Clock, moduleId: 'bitacora' },
    ],
  },
  {
    type: 'group',
    heading: 'Abastecimiento',
    items: [
      { label: 'Compras', path: '/compras', icon: ShoppingCart, moduleId: 'compras' },
      { label: 'Gastos', path: '/gastos', icon: Wallet, moduleId: 'gastos' },
      { label: 'Ingresos', path: '/ingresos', icon: ArrowDownToLine, moduleId: 'ingresos' },
      { label: 'Inventario', path: '/inventario', icon: Warehouse, moduleId: 'inventario' },
      { label: 'Productos', path: '/productos', icon: Boxes, moduleId: 'productos' },
    ],
  },
  {
    type: 'group',
    heading: 'Análisis',
    items: [
      { label: 'Reportes', path: '/reportes', icon: BarChart3, moduleId: 'reportes' },
    ],
  },
  {
    type: 'group',
    heading: 'Configuración',
    items: [
      { label: 'Usuarios', path: '/usuarios', icon: UsersRound, moduleId: 'usuarios' },
      { label: 'Perfiles', path: '/perfiles', icon: Shield, moduleId: 'perfiles' },
      { label: 'Configuración', path: '/configuracion', icon: Settings, moduleId: 'configuracion' },
    ],
  },
]

const allNavItems: NavItemDef[] = navSections.flatMap((s) => s.items)

/** Todas las entradas del sidebar excepto la bienvenida autenticada. */
export const sidebarRoutes = allNavItems.filter((i) => i.path !== '/inicio')

export function navItemMatchesPath(item: NavItemDef, pathname: string): boolean {
  if (item.end) return pathname === item.path
  return pathname === item.path || pathname.startsWith(`${item.path}/`)
}

export function navSectionHasActiveItem(section: NavSectionDef, pathname: string): boolean {
  const items = section.type === 'items' ? section.items : section.items
  return items.some((item) => navItemMatchesPath(item, pathname))
}
