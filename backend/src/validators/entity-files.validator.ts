import { z } from 'zod'

import { ENTITY_FILE_TYPES } from '../types/entity-file.js'

const entityFileTypeSchema = z.enum(ENTITY_FILE_TYPES)

export const entityFileInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(512),
  size: z.number().int().nonnegative(),
  mimeType: z.string().max(128).optional(),
  dataUrl: z.string().min(1).optional(),
  uploadedAt: z.string().max(64).optional(),
  uploadedBy: z.string().max(255).optional(),
})

export const syncEntityFilesSchema = z.object({
  entityType: entityFileTypeSchema,
  entityId: z.string().uuid(),
  entityLabel: z.string().max(255).optional(),
  files: z.array(entityFileInputSchema).max(30),
})

export const listEntityFilesQuerySchema = z.object({
  entityType: entityFileTypeSchema,
  entityId: z.string().uuid(),
})
