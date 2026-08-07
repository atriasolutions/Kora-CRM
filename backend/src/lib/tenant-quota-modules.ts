import type { MenuModuleId } from './menu-modules.js'

/** entity_type en crm_entity_files → módulo del menú. */
export const ENTITY_FILE_TYPE_TO_MODULE: Record<string, MenuModuleId> = {
  empresa: 'empresas',
  contacto: 'contactos',
  inventario: 'inventario',
  compra: 'compras',
  factura: 'facturacion',
  boleta: 'boletas',
  gasto: 'gastos',
  cotizacion: 'cotizaciones',
  oportunidad: 'oportunidades',
  proyecto: 'proyectos',
  solicitud: 'solicitudes',
  prueba_caso: 'pruebas_solicitud',
}

export const MODULE_LABELS_ES: Record<string, string> = {
  contactos: 'Contactos',
  empresas: 'Empresas',
  oportunidades: 'Oportunidades',
  cotizaciones: 'Cotizaciones',
  proyectos: 'Proyectos',
  solicitudes: 'Solicitudes',
  actividades: 'Actividades',
  facturacion: 'Facturación',
  boletas: 'Boletas',
  gastos: 'Gastos',
  compras: 'Compras',
  productos: 'Productos',
  inventario: 'Inventario',
  ingresos: 'Ingresos',
  notas: 'Notas',
  usuarios: 'Usuarios',
}

export const SEAT_COUNT_STATUSES = ['Activo', 'Por verificar'] as const

export const GUEST_COUNT_STATUSES = ['Activo', 'Invitado', 'Por verificar'] as const

export function statusCountsTowardSeat(status: string): boolean {
  return (SEAT_COUNT_STATUSES as readonly string[]).includes(status)
}

export function statusCountsTowardGuestQuota(status: string): boolean {
  return (GUEST_COUNT_STATUSES as readonly string[]).includes(status)
}

export const GB_BYTES = 1024 * 1024 * 1024

export function gbToBytes(gb: number): number {
  return Math.round(gb * GB_BYTES)
}

export function bytesToGb(bytes: number): number {
  return bytes / GB_BYTES
}
