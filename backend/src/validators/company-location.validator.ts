import { z } from 'zod'

const geo = z.number().finite()

const addressSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(128),
  street: z.string().max(2000).optional().default(''),
  city: z.string().max(128).optional().default(''),
  commune: z.string().max(128).optional(),
  region: z.string().max(128).optional().default(''),
  country: z.string().max(64).optional().default('Chile'),
  postalCode: z.string().max(32).optional(),
  lat: geo,
  lng: geo,
})

const branchSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
  street: z.string().max(2000).optional().default(''),
  city: z.string().max(128).optional().default(''),
  commune: z.string().max(128).optional(),
  region: z.string().max(128).optional().default(''),
  country: z.string().max(64).optional().default('Chile'),
  postalCode: z.string().max(32).optional(),
  phone: z.string().max(64).optional(),
  lat: geo,
  lng: geo,
})

const headquartersSchema = z.object({
  id: z.string().min(1).max(64).optional(),
  label: z.string().max(128).optional().default('Casa matriz'),
  street: z.string().max(2000).optional().default(''),
  city: z.string().max(128).optional().default(''),
  commune: z.string().max(128).optional(),
  region: z.string().max(128).optional().default(''),
  country: z.string().max(64).optional().default('Chile'),
  postalCode: z.string().max(32).optional(),
  lat: geo.optional().default(-33.4489),
  lng: geo.optional().default(-70.6693),
})

export const companyLocationsSchema = z.object({
  branches: z.array(branchSchema).default([]),
  addresses: z.array(addressSchema).default([]),
  headquarters: headquartersSchema.optional(),
})
