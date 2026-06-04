import { useCallback, useMemo, useState, type ReactNode } from 'react'

import {
  createAccessProfileApi,
  deleteAccessProfileApi,
  getAccessProfileApi,
  listAccessProfilesApi,
  updateAccessProfileApi,
} from '@/api/access-profiles'
import { isApiEnabled } from '@/api/config'
import { ProfilesRegistryContext } from '@/contexts/profiles-registry-context'
import { useAuth } from '@/hooks/use-auth'
import { profileDetailSeed } from '@/data/profiles.mock'
import type { AccessProfile } from '@/types/access-profile'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
const useApi = isApiEnabled()

function formatUpdatedAt(): string {
  return new Date().toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function initialProfilesLocal(): AccessProfile[] {
  return Object.values(profileDetailSeed)
}

export function ProfilesRegistryProvider({ children }: { children: ReactNode }) {
  const { session, refreshProfile } = useAuth()
  const [profiles, setProfiles] = useState<AccessProfile[]>(() =>
    useApi ? [] : initialProfilesLocal(),
  )

  const reloadFromApi = useCallback(async () => {
    const items = await listAccessProfilesApi()
    const full = await Promise.all(items.map((item) => getAccessProfileApi(item.id)))
    setProfiles(full)
  }, [])

  useRegistryApiBootstrap(reloadFromApi, { moduleId: 'perfiles' })

  const persist = useCallback((next: AccessProfile[]) => {
    setProfiles(next)
  }, [])

  const listItems = useMemo(
    () =>
      profiles.map(({ permissions: _p, ...item }) => item),
    [profiles],
  )

  const findById = useCallback(
    (id: string) => profiles.find((p) => p.id === id),
    [profiles],
  )

  const addProfile = useCallback(
    async (input: Omit<AccessProfile, 'id' | 'userCount' | 'updatedAt'>) => {
      if (useApi) {
        const created = await createAccessProfileApi({
          name: input.name,
          description: input.description,
          permissions: input.permissions,
        })
        persist([created, ...profiles])
        return created
      }
      const profile: AccessProfile = {
        ...input,
        id: `p-${Date.now()}`,
        userCount: 0,
        updatedAt: formatUpdatedAt(),
      }
      persist([profile, ...profiles])
      return profile
    },
    [persist, profiles],
  )

  const updateProfile = useCallback(
    async (profile: AccessProfile) => {
      if (useApi) {
        const updated = await updateAccessProfileApi(profile.id, {
          name: profile.name,
          description: profile.description,
          permissions: profile.permissions,
        })
        persist(profiles.map((p) => (p.id === profile.id ? updated : p)))
        if (session?.profileId === profile.id) {
          await refreshProfile()
        }
        return
      }
      persist(
        profiles.map((p) =>
          p.id === profile.id ? { ...profile, updatedAt: formatUpdatedAt() } : p,
        ),
      )
    },
    [persist, profiles, refreshProfile, session?.profileId],
  )

  const removeProfile = useCallback(
    async (id: string) => {
      const target = profiles.find((p) => p.id === id)
      if (!target || target.isSystem) return false
      if (useApi) {
        await deleteAccessProfileApi(id)
        persist(profiles.filter((p) => p.id !== id))
        return true
      }
      persist(profiles.filter((p) => p.id !== id))
      return true
    },
    [persist, profiles],
  )

  const value = useMemo(
    () => ({
      profiles,
      listItems,
      findById,
      addProfile,
      updateProfile,
      removeProfile,
    }),
    [profiles, listItems, findById, addProfile, updateProfile, removeProfile],
  )

  return (
    <ProfilesRegistryContext.Provider value={value}>
      {children}
    </ProfilesRegistryContext.Provider>
  )
}
