import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import {
  bitacoraDetailToApiBody,
  bitacoraFormToApiBody,
  createBitacoraApi,
  deleteBitacoraApi,
  listBitacoraApi,
  updateBitacoraApi,
} from '@/api/bitacora'
import { BitacoraRegistryContext } from '@/contexts/bitacora-registry-context'
import { STORAGE_PREFIX } from '@/config/brand'
import { resolveBitacoraListItem } from '@/data/bitacora.mock'
import type { BitacoraListItem } from '@/data/bitacora.mock'
import {
  applyFormValuesToBitacora,
  bitacoraDetailToFormValues,
  formValuesToBitacoraListItem,
  listItemFromBitacoraDetail,
  type BitacoraFormValues,
} from '@/lib/bitacora-form'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'

const useApi = isApiEnabled()
const STORAGE_KEY = `${STORAGE_PREFIX}-crm-user-bitacora`

function loadStored(): BitacoraListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as BitacoraListItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistLocal(items: BitacoraListItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

export function BitacoraRegistryProvider({ children }: { children: ReactNode }) {
  const [userBitacora, setUserBitacora] = useState<BitacoraListItem[]>(() => {
    if (useApi) return []
    return loadStored()
  })
  const [registryHydrated, setRegistryHydrated] = useState(!useApi)

  const reloadFromApi = useCallback(async () => {
    const items = await listBitacoraApi()
    setUserBitacora(items)
    setRegistryHydrated(true)
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { moduleId: 'bitacora' })

  const save = useCallback(
    (next: BitacoraListItem[]) => {
      setUserBitacora(next)
      if (!useApi) persistLocal(next)
    },
    [],
  )

  const findById = useCallback(
    (id: string) => userBitacora.find((b) => b.id === id),
    [userBitacora],
  )

  const addBitacora = useCallback(
    async (values: BitacoraFormValues) => {
      if (useApi) {
        const detail = await createBitacoraApi(bitacoraFormToApiBody(values))
        const item = listItemFromBitacoraDetail(detail)
        save([item, ...userBitacora])
        return item
      }
      const item = formValuesToBitacoraListItem(values)
      save([item, ...userBitacora])
      return item
    },
    [save, userBitacora],
  )

  const updateBitacoraFromDetail = useCallback(
    async (detail: BitacoraListItem) => {
      if (useApi) {
        const saved = await updateBitacoraApi(detail.id, bitacoraDetailToApiBody(detail))
        const item = listItemFromBitacoraDetail(saved)
        save(userBitacora.map((b) => (b.id === detail.id ? item : b)))
        return
      }
      save(userBitacora.map((b) => (b.id === detail.id ? detail : b)))
    },
    [save, userBitacora],
  )

  const updateBitacoraFromForm = useCallback(
    async (existing: BitacoraListItem, values: BitacoraFormValues) => {
      const next = applyFormValuesToBitacora(existing, values)
      await updateBitacoraFromDetail(next)
      return next
    },
    [updateBitacoraFromDetail],
  )

  const deleteBitacora = useCallback(
    async (id: string) => {
      if (useApi) {
        await deleteBitacoraApi(id)
      }
      save(userBitacora.filter((b) => b.id !== id))
    },
    [save, userBitacora],
  )

  const allBitacora = useMemo(() => userBitacora, [userBitacora])

  const value = useMemo(
    () => ({
      userBitacora,
      allBitacora,
      registryHydrated,
      findById,
      addBitacora,
      updateBitacoraFromDetail,
      updateBitacoraFromForm,
      deleteBitacora,
      reloadFromApi,
    }),
    [
      userBitacora,
      allBitacora,
      registryHydrated,
      findById,
      addBitacora,
      updateBitacoraFromDetail,
      updateBitacoraFromForm,
      deleteBitacora,
      reloadFromApi,
    ],
  )

  return (
    <BitacoraRegistryContext.Provider value={value}>
      {children}
    </BitacoraRegistryContext.Provider>
  )
}
