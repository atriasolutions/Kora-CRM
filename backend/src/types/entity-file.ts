export const ENTITY_FILE_TYPES = [
  'empresa',
  'contacto',
  'inventario',
  'compra',
  'factura',
  'boleta',
  'gasto',
  'trabajador',
  'cotizacion',
  'oportunidad',
  'proyecto',
  'solicitud',
  'prueba_caso',
] as const

export type EntityFileType = (typeof ENTITY_FILE_TYPES)[number]

export type EntityFileDto = {
  id: string
  name: string
  size: number
  mimeType?: string
  uploadedAt: string
  uploadedBy: string
  dataUrl?: string
}

export type EntityFileInput = {
  id?: string
  name: string
  size: number
  mimeType?: string
  dataUrl?: string
  uploadedAt?: string
  uploadedBy?: string
}

export type SyncEntityFilesInput = {
  entityType: EntityFileType
  entityId: string
  entityLabel?: string
  files: EntityFileInput[]
}
