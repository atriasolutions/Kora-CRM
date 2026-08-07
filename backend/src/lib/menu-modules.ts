/** IDs de módulo alineados con el frontend (`menu-modules.ts`). */
export type MenuModuleId =
  | 'dashboard'
  | 'contactos'
  | 'empresas'
  | 'oportunidades'
  | 'cotizaciones'
  | 'facturacion'
  | 'boletas'
  | 'actividades'
  | 'proyectos'
  | 'solicitudes'
  | 'bitacora'
  | 'pruebas_solicitud'
  | 'compras'
  | 'gastos'
  | 'ingresos'
  | 'inventario'
  | 'productos'
  | 'reportes'
  | 'usuarios'
  | 'perfiles'
  | 'configuracion'

export type PermissionAction = 'menu' | 'view' | 'create' | 'edit' | 'delete'

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  menu: 'ver menú',
  view: 'visualizar',
  create: 'crear',
  edit: 'editar',
  delete: 'eliminar',
}

export const MODULE_LABELS: Record<MenuModuleId, string> = {
  dashboard: 'Dashboard',
  contactos: 'Contactos',
  empresas: 'Empresas',
  oportunidades: 'Oportunidades',
  cotizaciones: 'Cotizaciones',
  facturacion: 'Facturación',
  boletas: 'Boletas',
  actividades: 'Actividades',
  proyectos: 'Proyectos',
  solicitudes: 'Solicitudes',
  bitacora: 'Bitácora',
  pruebas_solicitud: 'Pruebas de Solicitud',
  compras: 'Compras',
  gastos: 'Gastos',
  ingresos: 'Ingresos',
  inventario: 'Inventario',
  productos: 'Productos',
  reportes: 'Reportes',
  usuarios: 'Usuarios',
  perfiles: 'Perfiles',
  configuracion: 'Configuración',
}
