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
  UsersRound,
  ShoppingCart,
  ArrowDownToLine,
  Wallet,
  Warehouse,
  Puzzle,
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
  | { type: 'group'; heading: string; items: NavItemDef[] }
  | { type: 'items'; items: NavItemDef[] }

/** Rutas coherentes con el sidebar; la bienvenida es `/` (sin permisos). */
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
      { label: 'Contactos', path: '/contactos', icon: Contact, moduleId: 'contactos' },
      { label: 'Empresas', path: '/empresas', icon: Building2, moduleId: 'empresas' },
      { label: 'Oportunidades', path: '/oportunidades', icon: Target, moduleId: 'oportunidades' },
      { label: 'Cotizaciones', path: '/cotizaciones', icon: FileSpreadsheet, moduleId: 'cotizaciones' },
      { label: 'Facturación', path: '/facturacion', icon: Wallet, moduleId: 'facturacion' },
      { label: 'Actividades', path: '/actividades', icon: ListTodo, moduleId: 'actividades' },
      { label: 'Proyectos', path: '/proyectos', icon: Puzzle, moduleId: 'proyectos' },
      { label: 'Compras', path: '/compras', icon: ShoppingCart, moduleId: 'compras' },
      { label: 'Ingresos', path: '/ingresos', icon: ArrowDownToLine, moduleId: 'ingresos' },
      { label: 'Inventario', path: '/inventario', icon: Warehouse, moduleId: 'inventario' },
      { label: 'Productos', path: '/productos', icon: Boxes, moduleId: 'productos' },
      { label: 'Reportes', path: '/reportes', icon: BarChart3, moduleId: 'reportes' },
    ],
  },
  {
    type: 'group',
    heading: 'CONFIGURACIÓN',
    items: [
      { label: 'Usuarios', path: '/usuarios', icon: UsersRound, moduleId: 'usuarios' },
      { label: 'Perfiles', path: '/perfiles', icon: Shield, moduleId: 'perfiles' },
      { label: 'Configuración', path: '/configuracion', icon: Settings, moduleId: 'configuracion' },
    ],
  },
]

const allNavItems: NavItemDef[] = navSections.flatMap((s) =>
  s.type === 'items' ? s.items : s.items,
)

/** Todas las entradas del sidebar excepto la bienvenida (`/`). */
export const sidebarRoutes = allNavItems.filter((i) => i.path !== '/')
