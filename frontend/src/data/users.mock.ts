import { profileIdForUserRole, profileNameForId } from '@/data/profiles.mock'

export type UserStatus = 'Activo' | 'Invitado' | 'Inactivo' | 'Por verificar'

export type UserRole =
  | 'Admin'
  | 'Manager'
  | 'Ventas'
  | 'Marketing'
  | 'Operaciones'
  | 'Invitado'
  | 'Soporte'
  | 'CS'

export type UserListItem = {
  id: string
  name: string
  email: string
  role: UserRole | string
  profileId: string
  profileName: string
  lastLogin: string
  status: UserStatus
  avatarUrl?: string
  guestCompanyId?: string
  guestCompanyName?: string
}

type UserListSeedRow = Omit<UserListItem, 'profileId' | 'profileName'>

const userListSeedBase: UserListSeedRow[] = [
  {
    id: 'u1',
    name: 'María López',
    email: 'maria.lopez@kora.io',
    role: 'Admin',
    lastLogin: 'Hoy, 09:12',
    status: 'Activo',
  },
  {
    id: 'u2',
    name: 'Carlos Vega',
    email: 'carlos.vega@kora.io',
    role: 'Ventas',
    lastLogin: 'Hoy, 08:45',
    status: 'Activo',
  },
  {
    id: 'u3',
    name: 'Ana Ruiz',
    email: 'ana.ruiz@kora.io',
    role: 'Ventas',
    lastLogin: 'Ayer, 17:30',
    status: 'Activo',
  },
  {
    id: 'u4',
    name: 'Roberto Sánchez',
    email: 'roberto.sanchez@kora.io',
    role: 'Manager',
    lastLogin: '14 may, 11:00',
    status: 'Activo',
  },
  {
    id: 'u5',
    name: 'Laura Fernández',
    email: 'laura.fernandez@kora.io',
    role: 'Marketing',
    lastLogin: '12 may, 09:20',
    status: 'Activo',
  },
  {
    id: 'u6',
    name: 'Diego Méndez',
    email: 'diego.mendez@kora.io',
    role: 'Soporte',
    lastLogin: '10 may, 14:15',
    status: 'Inactivo',
  },
  {
    id: 'u7',
    name: 'Valentina Torres',
    email: 'valentina.torres@kora.io',
    role: 'CS',
    lastLogin: '15 may, 10:05',
    status: 'Activo',
  },
  {
    id: 'u8',
    name: 'Nuevo colaborador',
    email: 'nuevo@empresa.com',
    role: 'Ventas',
    lastLogin: '—',
    status: 'Invitado',
  },
]

export const userListSeed: UserListItem[] = userListSeedBase.map((row) => {
  const profileId = profileIdForUserRole(row.role)
  return {
    ...row,
    profileId,
    profileName: profileNameForId(profileId),
  }
})
