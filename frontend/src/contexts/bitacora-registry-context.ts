import { createContext } from 'react'

import type { BitacoraListItem } from '@/data/bitacora.mock'
import type { BitacoraFormValues } from '@/lib/bitacora-form'

export type BitacoraRegistryContextValue = {
  userBitacora: BitacoraListItem[]
  allBitacora: BitacoraListItem[]
  registryHydrated: boolean
  findById: (id: string) => BitacoraListItem | undefined
  addBitacora: (values: BitacoraFormValues) => Promise<BitacoraListItem>
  updateBitacoraFromDetail: (detail: BitacoraListItem) => Promise<void>
  updateBitacoraFromForm: (
    existing: BitacoraListItem,
    values: BitacoraFormValues,
  ) => Promise<BitacoraListItem>
  deleteBitacora: (id: string) => Promise<void>
  reloadFromApi: () => Promise<void>
}

export const BitacoraRegistryContext = createContext<BitacoraRegistryContextValue | null>(
  null,
)
