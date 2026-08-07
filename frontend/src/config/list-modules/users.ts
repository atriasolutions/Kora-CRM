import { List } from 'lucide-react'

import type { UserListItem } from '@/data/users.mock'
import { userStatusVariant } from '@/lib/user-display'
import { getUserDetailPath } from '@/lib/user-routes'
import type { ModuleListConfig } from '@/types/list-module'

export type { UserListItem } from '@/data/users.mock'

export const usersListConfig: ModuleListConfig<UserListItem> = {
  title: 'Usuarios',
  description: 'Equipo, roles y accesos al CRM.',
  entityPlural: 'usuarios',
  newItemLabel: 'Invitar usuario',
  total: 0,
  seeds: [],
  showImport: false,
  showRowActions: false,
  viewModes: [{ id: 'lista', label: 'Lista', Icon: List }],
  getDetailPath: (row) => getUserDetailPath(row.id),
  searchFilter: (row, q) =>
    row.name.toLowerCase().includes(q) ||
    row.email.toLowerCase().includes(q) ||
    row.role.toLowerCase().includes(q) ||
    row.profileName.toLowerCase().includes(q),
  columns: [
    {
      kind: 'primary',
      header: 'Usuario',
      sortable: true,
      sortKey: 'name',
      className: 'w-[220px]',
      title: (r) => r.name,
      subtitle: (r) => r.email,
      avatarUrl: (r) => r.avatarUrl,
      avatarResolveUserId: (r) => r.id,
    },
    {
      kind: 'text',
      header: 'Email',
      sortable: true,
      sortKey: 'email',
      defaultHidden: true,
      className: 'min-w-[180px]',
      cell: (r) => r.email,
      mono: true,
    },
    {
      kind: 'text',
      header: 'Rol',
      className: 'w-[120px]',
      cell: (r) => r.role,
    },
    {
      kind: 'text',
      header: 'Perfil',
      sortable: true,
      sortValue: (r) => r.profileName,
      className: 'w-[150px]',
      cell: (r) => r.profileName,
    },
    {
      kind: 'text',
      header: 'Último acceso',
      className: 'w-[140px]',
      cell: (r) => r.lastLogin,
    },
    {
      kind: 'badge',
      header: 'Estado',
      sortable: true,
      sortKey: 'status',
      className: 'w-[110px]',
      label: (r) => r.status,
      variant: (r) => userStatusVariant(r.status),
    },
    {
      kind: 'text',
      header: 'Alta',
      sortable: true,
      sortKey: 'createdAt',
      defaultHidden: true,
      className: 'w-[120px]',
      cell: () => '—',
    },
  ],
}
