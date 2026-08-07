import { createContext } from 'react'

import type { BoletaDetail } from '@/data/boleta-detail.mock'
import type { BoletaListItem } from '@/data/boletas.mock'
import type { CreateBoletaFormValues } from '@/lib/boleta-create'
import type { ArchivedBoletaRecord } from '@/lib/boleta-archive'

export type ArchivedBoletaEntry = ArchivedBoletaRecord & {
  boleta: BoletaListItem
}

export type BoletasRegistryContextValue = {
  userBoletas: BoletaListItem[]
  allBoletas: BoletaListItem[]
  archivedBoletas: ArchivedBoletaEntry[]
  findById: (id: string) => BoletaListItem | undefined
  addBoleta: (values: CreateBoletaFormValues) => Promise<BoletaListItem>
  updateBoletaFromDetail: (detail: BoletaDetail) => Promise<void>
  patchBoletaStatus: (id: string, status: string) => Promise<BoletaDetail>
  archiveBoleta: (id: string) => Promise<void>
  archiveBoletas: (ids: string[]) => Promise<void>
  restoreBoleta: (id: string) => Promise<void>
  restoreBoletas: (ids: string[]) => Promise<void>
  permanentlyDeleteBoleta: (id: string) => Promise<void>
  permanentlyDeleteBoletas: (ids: string[]) => Promise<void>
  isArchived: (id: string) => boolean
  reloadFromApi: () => Promise<void>
}

export const BoletasRegistryContext = createContext<BoletasRegistryContextValue | null>(null)
