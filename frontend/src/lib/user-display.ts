import type { UserListItem, UserStatus } from '@/data/users.mock'
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
