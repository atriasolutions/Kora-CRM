import type { UserDetail } from '@/data/user-detail.mock'
import type { UserListItem } from '@/data/users.mock'

/** Campos de ficha que la API aún no devuelve; se conservan al guardar. */
export function mergeUserDetailFromApi(
  previous: UserDetail,
  saved: UserDetail,
): UserDetail {
  return {
    ...previous,
    ...saved,
    avatarUrl: saved.avatarUrl ?? previous.avatarUrl,
    teams: previous.teams ?? [],
    permissions: previous.permissions ?? [],
    recentSessions: previous.recentSessions ?? [],
    notes: previous.notes ?? [],
  }
}

/** El listado del registry no debe cargar data URLs (solo ficha / GET por id). */
export function userListItemForRegistry(item: UserListItem): UserListItem {
  const url = item.avatarUrl?.trim()
  if (!url || url.startsWith('data:')) {
    return { ...item, avatarUrl: undefined }
  }
  return item
}
