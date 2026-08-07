import { createContext } from 'react'
import type { PruebaSolicitudListItem } from '@/data/pruebas-solicitud.mock'

export type ArchivedPruebaEntry = {
  id: string
  archivedAt: number
  snapshot?: PruebaSolicitudListItem
}

export type ArchivedPruebaStore = Record<string, ArchivedPruebaEntry>

export type PruebasSolicitudRegistryValue = {
  allPruebas: PruebaSolicitudListItem[]
  archivedPruebas: ArchivedPruebaEntry[]
  registryHydrated: boolean
  reloadFromApi: () => Promise<void>
  addPrueba: (body: {
    solicitudId: string
    description?: string
    executedAt?: string
  }) => Promise<PruebaSolicitudListItem>
  archivePrueba: (id: string) => Promise<void>
  archivePruebas: (ids: string[]) => Promise<void>
  restorePrueba: (id: string) => Promise<void>
  restorePruebas: (ids: string[]) => Promise<void>
  permanentlyDeletePrueba: (id: string) => Promise<void>
  permanentlyDeletePruebas: (ids: string[]) => Promise<void>
  isArchived: (id: string) => boolean
}

export const PruebasSolicitudRegistryContext = createContext<PruebasSolicitudRegistryValue | null>(
  null,
)
