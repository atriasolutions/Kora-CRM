import { createContext } from 'react'

import type { UserDetail } from '@/data/user-detail.mock'
import type { UserListItem } from '@/data/users.mock'
import type { UserFormValues } from '@/lib/user-form'

export type UsersRegistryValue = {
  allUsers: UserListItem[]
  userUsers: UserListItem[]
  addUser: (values: UserFormValues) => Promise<UserListItem>
  updateUserFromDetail: (detail: UserDetail) => Promise<UserDetail>
  removeUser: (id: string) => Promise<void>
  findById: (id: string) => UserListItem | undefined
  reloadFromApi: () => Promise<void>
  usersDirectoryLoaded: boolean
}

export const UsersRegistryContext = createContext<UsersRegistryValue | null>(
  null,
)
