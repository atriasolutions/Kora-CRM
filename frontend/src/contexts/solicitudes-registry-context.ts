import { createContext } from 'react'

import type { SolicitudDetail } from '@/data/solicitudes.mock'
import type { SolicitudListItem } from '@/data/solicitudes.mock'
import type { CreateSolicitudFormValues } from '@/lib/solicitud-create'
import type { ArchivedSolicitudRecord } from '@/lib/solicitud-archive'

export type ArchivedSolicitudEntry = ArchivedSolicitudRecord & {
  solicitud: SolicitudListItem
}

export type SolicitudesRegistryContextValue = {
  userSolicitudes: SolicitudListItem[]
  allSolicitudes: SolicitudListItem[]
  archivedSolicitudes: ArchivedSolicitudEntry[]
  findById: (id: string) => SolicitudListItem | undefined
  addSolicitud: (
    values: CreateSolicitudFormValues,
    descriptionFiles?: import('@/lib/solicitud-files').SolicitudFile[],
  ) => Promise<SolicitudListItem>
  updateSolicitud: (id: string, patch: Partial<SolicitudListItem>) => Promise<void>
  updateSolicitudFromDetail: (detail: SolicitudDetail) => Promise<SolicitudDetail>
  archiveSolicitud: (id: string) => Promise<void>
  archiveSolicitudes: (ids: string[]) => Promise<void>
  restoreSolicitud: (id: string) => Promise<void>
  restoreSolicitudes: (ids: string[]) => Promise<void>
  permanentlyDeleteSolicitud: (id: string) => Promise<void>
  permanentlyDeleteSolicitudes: (ids: string[]) => Promise<void>
  isArchived: (id: string) => boolean
  reloadFromApi: () => Promise<void>
}

export const SolicitudesRegistryContext =
  createContext<SolicitudesRegistryContextValue | null>(null)
