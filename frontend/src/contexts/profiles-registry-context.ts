import { createContext } from 'react'

import type { AccessProfile, AccessProfileListItem } from '@/types/access-profile'

export type ProfilesRegistryValue = {
  profiles: AccessProfile[]
  listItems: AccessProfileListItem[]
  findById: (id: string) => AccessProfile | undefined
  addProfile: (
    profile: Omit<AccessProfile, 'id' | 'userCount' | 'updatedAt'>,
  ) => Promise<AccessProfile>
  updateProfile: (profile: AccessProfile) => Promise<void>
  removeProfile: (id: string) => Promise<boolean>
}

export const ProfilesRegistryContext = createContext<ProfilesRegistryValue | null>(
  null,
)
