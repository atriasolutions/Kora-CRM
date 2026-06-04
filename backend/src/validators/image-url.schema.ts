import { z } from 'zod'

/** Avatares/logos subidos desde el cliente llegan como data URL (base64), mucho más largos que una URL HTTP. */
export const entityImageUrlSchema = z.string().max(4_000_000).optional()
