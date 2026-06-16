import { profileIdForUserRole } from '@/data/profiles.mock'
import type { UserDetail } from '@/data/user-detail.mock'
import type { UserListItem, UserStatus } from '@/data/users.mock'

type GuestUserRef = Pick<UserListItem, 'role' | 'profileId' | 'profileName'>
import type { BadgeProps } from '@/components/ui/badge'

export type UserBadgeVariant = NonNullable<BadgeProps['variant']>

export function userStatusVariant(status: UserStatus): UserBadgeVariant {
  switch (status) {
    case 'Activo':
      return 'customer'
    case 'Invitado':
      return 'proposal'
    case 'Por verificar':
      return 'negotiation'
    case 'Inactivo':
    default:
      return 'muted'
  }
}

export function userRoleLabel(role: UserListItem['role']): string {
  return role.trim() || '—'
}

export function isGuestUserRef(user: GuestUserRef): boolean {
  if (user.role === 'Invitado') return true
  if (user.profileName?.trim().toLowerCase() === 'invitado') return true
  return user.profileId === profileIdForUserRole('Invitado')
}

export function isGuestUserListItem(user: UserListItem): boolean {
  return isGuestUserRef(user)
}

export function isGuestUserDetail(
  user: Pick<UserDetail, 'role' | 'profileId' | 'profileName'>,
): boolean {
  return isGuestUserRef(user)
}
