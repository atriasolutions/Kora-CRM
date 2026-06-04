/** Módulos del CRM para asignación de permisos en perfiles de acceso. */
export type MenuModuleId =
  | 'dashboard'
  | 'contactos'
  | 'empresas'
  | 'oportunidades'
  | 'cotizaciones'
  | 'facturacion'
  | 'actividades'
  | 'proyectos'
  | 'compras'
  | 'ingresos'
  | 'inventario'
  | 'productos'
  | 'reportes'
  | 'usuarios'
  | 'perfiles'
  | 'configuracion'

export type MenuModuleDef = {
  id: MenuModuleId
  label: string
  /** Primer segmento de ruta (`/` → dashboard). */
  pathSegment: string
}

export const MENU_MODULE_DEFINITIONS: MenuModuleDef[] = [
  { id: 'dashboard', label: 'Dashboard', pathSegment: '' },
  { id: 'contactos', label: 'Contactos', pathSegment: 'contactos' },
  { id: 'empresas', label: 'Empresas', pathSegment: 'empresas' },
  { id: 'oportunidades', label: 'Oportunidades', pathSegment: 'oportunidades' },
  { id: 'cotizaciones', label: 'Cotizaciones', pathSegment: 'cotizaciones' },
  { id: 'facturacion', label: 'Facturación', pathSegment: 'facturacion' },
  { id: 'actividades', label: 'Actividades', pathSegment: 'actividades' },
  { id: 'proyectos', label: 'Proyectos', pathSegment: 'proyectos' },
  { id: 'compras', label: 'Compras', pathSegment: 'compras' },
  { id: 'ingresos', label: 'Ingresos', pathSegment: 'ingresos' },
  { id: 'inventario', label: 'Inventario', pathSegment: 'inventario' },
  { id: 'productos', label: 'Productos', pathSegment: 'productos' },
  { id: 'reportes', label: 'Reportes', pathSegment: 'reportes' },
  { id: 'usuarios', label: 'Usuarios', pathSegment: 'usuarios' },
  { id: 'perfiles', label: 'Perfiles', pathSegment: 'perfiles' },
  { id: 'configuracion', label: 'Configuración', pathSegment: 'configuracion' },
]

export type PermissionAction = 'menu' | 'view' | 'create' | 'edit' | 'delete'

export type ModulePermissionFlags = Record<PermissionAction, boolean>

export type MenuModulePermission = {
  moduleId: MenuModuleId
  label: string
  flags: ModulePermissionFlags
}

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  menu: 'Ver menú',
  view: 'Visualización',
  create: 'Creación',
  edit: 'Edición',
  delete: 'Eliminación',
}

export function createPermissionFlags(
  partial?: Partial<ModulePermissionFlags>,
): ModulePermissionFlags {
  return {
    menu: false,
    view: false,
    create: false,
    edit: false,
    delete: false,
    ...partial,
  }
}

export function createFullModulePermissions(): MenuModulePermission[] {
  return MENU_MODULE_DEFINITIONS.map((m) => ({
    moduleId: m.id,
    label: m.label,
    flags: createPermissionFlags({
      menu: true,
      view: true,
      create: true,
      edit: true,
      delete: true,
    }),
  }))
}

/** Asegura una fila por cada módulo del CRM (los perfiles antiguos pueden traer solo un subconjunto). */
export function normalizeProfilePermissions(
  permissions: MenuModulePermission[],
): MenuModulePermission[] {
  const byId = new Map(permissions.map((p) => [p.moduleId, p]))
  return MENU_MODULE_DEFINITIONS.map((def) => {
    const existing = byId.get(def.id)
    if (existing) {
      return { ...existing, moduleId: def.id, label: def.label }
    }
    return {
      moduleId: def.id,
      label: def.label,
      flags: createPermissionFlags(),
    }
  })
}

export function createViewOnlyModulePermissions(
  menuIds: MenuModuleId[],
): MenuModulePermission[] {
  return MENU_MODULE_DEFINITIONS.map((m) => {
    const inMenu = menuIds.includes(m.id)
    return {
      moduleId: m.id,
      label: m.label,
      flags: createPermissionFlags({
        menu: inMenu,
        view: inMenu,
        create: false,
        edit: false,
        delete: false,
      }),
    }
  })
}

export function pathToModuleId(pathname: string): MenuModuleId | null {
  const segment = pathname.replace(/^\//, '').split('/')[0] ?? ''
  if (!segment) return 'dashboard'
  const found = MENU_MODULE_DEFINITIONS.find((m) => m.pathSegment === segment)
  return found?.id ?? null
}

export function moduleIdFromNavPath(path: string): MenuModuleId | null {
  if (path === '/') return 'dashboard'
  return pathToModuleId(path)
}
