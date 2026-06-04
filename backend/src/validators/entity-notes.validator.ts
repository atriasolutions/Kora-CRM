import { z } from 'zod'

import { ENTITY_NOTE_TYPES } from '../types/entity-note.js'

const entityNoteTypeSchema = z.enum(ENTITY_NOTE_TYPES)

const mentionSchema = z.object({
  kind: z.string().min(1).max(64),
  recordId: z.string().min(1).max(255),
  label: z.string().min(1).max(255),
})

export const listEntityNotesQuerySchema = z.object({
  entityType: entityNoteTypeSchema,
  entityId: z.string().uuid(),
})

export const createEntityNoteSchema = z.object({
  entityType: entityNoteTypeSchema,
  entityId: z.string().uuid(),
  body: z.string().min(1).max(100_000),
  mentions: z.array(mentionSchema).max(50).optional(),
})
