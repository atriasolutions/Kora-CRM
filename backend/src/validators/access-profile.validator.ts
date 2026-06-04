import { z } from 'zod'

const permissionFlagsSchema = z.object({
  menu: z.boolean(),
  view: z.boolean(),
  create: z.boolean(),
  edit: z.boolean(),
  delete: z.boolean(),
})

const permissionSchema = z.object({
  moduleId: z.string().min(1).max(64),
  label: z.string().optional(),
  flags: permissionFlagsSchema,
})

export const createAccessProfileSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  permissions: z.array(permissionSchema).min(1),
})

export const updateAccessProfileSchema = createAccessProfileSchema.partial()
