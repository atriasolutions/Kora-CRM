import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { isApiEnabled } from '@/api/config'
import { isForbiddenError } from '@/api/errors'
import {
  createUserApi,
  listUserAssigneesApi,
  listUsersApi,
  updateUserApi,
  userDetailToApiBody,
  userFormToApiBody,
} from '@/api/users'
import { UsersRegistryContext } from '@/contexts/users-registry-context'
import { getUserDetail } from '@/data/user-detail.mock'
import type { UserListItem } from '@/data/users.mock'
import type { UserDetail } from '@/data/user-detail.mock'
import {
  applyFormValuesToUser,
  listItemFromUserDetail,
  type UserFormValues,
} from '@/lib/user-form'
import { mergeUserDetailFromApi, userListItemForRegistry } from '@/lib/user-detail-merge'
import { registerUserInDisplayCache, registerUsersInDisplayCache } from '@/lib/user-display-cache'
import {
  cacheUserAvatarUrl,
  invalidateUserAvatarCache,
} from '@/lib/user-avatar-resolve'
import { useAuth } from '@/hooks/use-auth'
import { useRegistryApiBootstrap } from '@/hooks/use-registry-api-bootstrap'
import { canModule, getProfilePermissionMap } from '@/lib/access-control'

const useApi = isApiEnabled()

export function UsersRegistryProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [userUsers, setUserUsers] = useState<UserListItem[]>([])
  const [usersDirectoryLoaded, setUsersDirectoryLoaded] = useState(!useApi)

  const applyUserList = useCallback((items: UserListItem[]) => {
    const mapped = items.map(userListItemForRegistry)
    registerUsersInDisplayCache(
      mapped.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      })),
    )
    setUserUsers(mapped)
  }, [])

  const reloadFromApi = useCallback(async () => {
    try {
      const map = profile ? getProfilePermissionMap(profile) : null
      const canListUsers = !useApi || !map || canModule(map, 'usuarios', 'view')
      const items = canListUsers
        ? await listUsersApi()
        : await listUserAssigneesApi()
      applyUserList(items)
    } catch (err) {
      if (isForbiddenError(err)) {
        const items = await listUserAssigneesApi()
        applyUserList(items)
        return
      }
      throw err
    } finally {
      setUsersDirectoryLoaded(true)
    }
  }, [applyUserList, profile])

  useRegistryApiBootstrap(reloadFromApi, { enabled: false })

  const save = useCallback((next: UserListItem[]) => {
    setUserUsers(next)
  }, [])

  const allUsers = useMemo(() => userUsers, [userUsers])

  const findById = useCallback(
    (id: string) => allUsers.find((u) => u.id === id),
    [allUsers],
  )

  const updateUserFromDetail = useCallback(
    async (detail: UserDetail): Promise<UserDetail> => {
      if (useApi) {
        const saved = await updateUserApi(detail.id, userDetailToApiBody(detail))
        const merged = mergeUserDetailFromApi(detail, saved)
        invalidateUserAvatarCache(merged.name, merged.id)
        const item = userListItemForRegistry(listItemFromUserDetail(merged))
        registerUserInDisplayCache({
          id: item.id,
          name: item.name,
          email: item.email,
        })
        save(userUsers.map((u) => (u.id === detail.id ? item : u)))
        return merged
      }
      const item = listItemFromUserDetail(detail)
      if (userUsers.some((u) => u.id === detail.id)) {
        save(userUsers.map((u) => (u.id === detail.id ? item : u)))
      }
      return detail
    },
    [save, userUsers],
  )

  const addUser = useCallback(
    async (values: UserFormValues) => {
      if (useApi) {
        const avatarUrl = values.avatarUrl?.trim() || undefined
        const detail = await createUserApi(
          userFormToApiBody(avatarUrl ? { ...values, avatarUrl: '' } : values),
        )
        const saved = avatarUrl
          ? await updateUserApi(detail.id, { avatarUrl })
          : detail
        invalidateUserAvatarCache(saved.name, saved.id)
        if (saved.avatarUrl?.trim()) {
          cacheUserAvatarUrl(saved.id, saved.name, saved.avatarUrl)
        }
        const item = userListItemForRegistry(listItemFromUserDetail(saved))
        registerUserInDisplayCache({
          id: item.id,
          name: item.name,
          email: item.email,
        })
        save([item, ...userUsers])
        return item
      }
      const id = `u${Date.now()}`
      const draft = applyFormValuesToUser(getUserDetail(id), {
        ...values,
        status: 'Invitado',
      })
      const item = listItemFromUserDetail(draft)
      save([item, ...userUsers])
      return item
    },
    [save, userUsers],
  )

  const value = useMemo(
    () => ({
      allUsers,
      userUsers,
      addUser,
      updateUserFromDetail,
      findById,
      reloadFromApi,
      usersDirectoryLoaded,
    }),
    [
      allUsers,
      userUsers,
      addUser,
      updateUserFromDetail,
      findById,
      reloadFromApi,
      usersDirectoryLoaded,
    ],
  )

  return (
    <UsersRegistryContext.Provider value={value}>{children}</UsersRegistryContext.Provider>
  )
}
