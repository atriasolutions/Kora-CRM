/** Scopes alineados con el frontend (`EntityNotesScope`). */
export const ENTITY_NOTE_TYPES = [
  'contacto',
  'empresa',
  'oportunidad',
  'cotizacion',
  'factura',
  'compra',
  'producto',
  'inventario',
  'recepcion',
  'actividad',
  'proyecto',
  'solicitud',
  'usuario',
] as const

export type EntityNoteType = (typeof ENTITY_NOTE_TYPES)[number]

export type EntityNoteMentionDto = {
  kind: string
  recordId: string
  label: string
}

export type EntityNoteDto = {
  id: string
  body: string
  mentions?: EntityNoteMentionDto[]
  author: string
  when: string
}

export type CreateEntityNoteInput = {
  entityType: EntityNoteType
  entityId: string
  body: string
  mentions?: EntityNoteMentionDto[]
}
