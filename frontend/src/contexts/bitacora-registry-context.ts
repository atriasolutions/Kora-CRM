import { createContext } from 'react'

import type { BitacoraListItem } from '@/data/bitacora.mock'
import type { BitacoraFormValues } from '@/lib/bitacora-form'
import type { ArchivedBitacoraRecord } from '@/lib/bitacora-archive'

export type ArchivedBitacoraEntry = ArchivedBitacoraRecord & {
  entry: BitacoraListItem
}

export type BitacoraRegistryContextValue = {
  userBitacora: BitacoraListItem[]
  allBitacora: BitacoraListItem[]
  registryHydrated: boolean
  archivedBitacora: ArchivedBitacoraEntry[]
  findById: (id: string) => BitacoraListItem | undefined
  addBitacora: (values: BitacoraFormValues) => Promise<BitacoraListItem>
  updateBitacoraFromDetail: (detail: BitacoraListItem) => Promise<void>
  updateBitacoraFromForm: (
    existing: BitacoraListItem,
    values: BitacoraFormValues,
  ) => Promise<BitacoraListItem>
  archiveBitacora: (id: string) => Promise<void>
  archiveBitacoraEntries: (ids: string[]) => Promise<void>
  restoreBitacora: (id: string) => Promise<void>
  restoreBitacoraEntries: (ids: string[]) => Promise<void>
  permanentlyDeleteBitacora: (id: string) => Promise<void>
  permanentlyDeleteBitacoraEntries: (ids: string[]) => Promise<void>
  /** @deprecated Usar archiveBitacora */
  deleteBitacora: (id: string) => Promise<void>
  isArchived: (id: string) => boolean
  reloadFromApi: () => Promise<void>
}

export const BitacoraRegistryContext = createContext<BitacoraRegistryContextValue | null>(
  null,
)
