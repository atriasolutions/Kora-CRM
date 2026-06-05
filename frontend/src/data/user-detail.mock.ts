import type { ContactNote } from '@/data/contact-detail.mock'
import { profileIdForUserRole } from '@/data/profiles.mock'
import { userListSeed, type UserListItem } from '@/data/users.mock'
import { mergeEntityNotesForMock } from '@/lib/entity-notes-storage'
import {
  applyUserListOverride,
  loadUserDetailOverride,
  type UserDetailOverride,
} from '@/lib/user-detail-storage'

export type UserPermissionAccess = 'Completo' | 'Lectura' | 'Sin acceso'

export type UserPermissionModule = {
  id: string
  label: string
  access: UserPermissionAccess
}

export type UserSessionEntry = {
  device: string
  location: string
  when: string
}

export type UserDetail = UserListItem & {
  profileId: string
  phone: string
  department: string
  jobTitle: string
  timezone: string
  language: string
  memberSince: string
  twoFactorEnabled: boolean
  twoFactorConfigured?: boolean
  bio: string
  teams: string[]
  permissions: UserPermissionModule[]
  recentSessions: UserSessionEntry[]
  notes: ContactNote[]
}

const DEFAULT_PERMISSIONS: UserPermissionModule[] = [
  { id: 'contactos', label: 'Contactos', access: 'Completo' },
  { id: 'empresas', label: 'Empresas', access: 'Completo' },
  { id: 'oportunidades', label: 'Oportunidades', access: 'Completo' },
  { id: 'cotizaciones', label: 'Cotizaciones', access: 'Lectura' },
  { id: 'facturacion', label: 'Facturación', access: 'Lectura' },
  { id: 'productos', label: 'Productos', access: 'Lectura' },
  { id: 'inventario', label: 'Inventario', access: 'Sin acceso' },
  { id: 'reportes', label: 'Reportes', access: 'Lectura' },
  { id: 'usuarios', label: 'Usuarios', access: 'Sin acceso' },
  { id: 'configuracion', label: 'Configuración', access: 'Sin acceso' },
]

const ADMIN_PERMISSIONS: UserPermissionModule[] = DEFAULT_PERMISSIONS.map((m) => ({
  ...m,
  access: 'Completo' as const,
}))

const SALES_PERMISSIONS: UserPermissionModule[] = DEFAULT_PERMISSIONS.map((m) => {
  if (['contactos', 'empresas', 'oportunidades', 'cotizaciones', 'actividades'].includes(m.id)) {
    return { ...m, access: 'Completo' as const }
  }
  if (m.id === 'usuarios' || m.id === 'configuracion') {
    return { ...m, access: 'Sin acceso' as const }
  }
  return { ...m, access: 'Lectura' as const }
})

function detailExtrasForSeed(
  base: UserListItem,
  idx: number,
): Omit<
  UserDetail,
  | keyof UserListItem
  | 'notes'
  | 'permissions'
  | 'recentSessions'
  | 'profileId'
> {
  const departments = ['Dirección', 'Ventas', 'Marketing', 'Operaciones', 'Soporte']
  const titles = [
    'Directora comercial',
    'Ejecutivo de ventas',
    'Ejecutiva de ventas',
    'Gerente regional',
    'Coordinadora de marketing',
    'Analista de soporte',
    'Customer Success',
    'Colaborador invitado',
  ]
  return {
    phone: `+56 9 ${8000 + idx * 111} ${2000 + idx}`,
    department: departments[idx % departments.length]!,
    jobTitle: titles[idx % titles.length]!,
    timezone: 'America/Santiago',
    language: 'Español (Chile)',
    memberSince: `${10 + idx} ene 2024`,
    twoFactorEnabled: base.status === 'Activo' && idx % 3 !== 2,
    bio:
      idx === 0
        ? 'Responsable del equipo comercial y configuración del CRM.'
        : `Miembro del equipo ${departments[idx % departments.length]}.`,
    teams:
      idx === 0
        ? ['Comercial', 'Dirección']
        : idx < 4
          ? ['Comercial']
          : idx === 4
            ? ['Marketing']
            : ['Operaciones'],
  }
}

const OPERATIONS_PERMISSIONS: UserPermissionModule[] = DEFAULT_PERMISSIONS.map((m) => {
  if (['proyectos', 'compras', 'ingresos', 'actividades'].includes(m.id)) {
    return { ...m, access: 'Completo' as const }
  }
  if (['inventario', 'productos'].includes(m.id)) {
    return { ...m, access: 'Lectura' as const }
  }
  return { ...m, access: 'Sin acceso' as const }
})

const INVITED_PERMISSIONS: UserPermissionModule[] = DEFAULT_PERMISSIONS.map((m) =>
  m.id === 'proyectos' ? { ...m, access: 'Lectura' as const } : { ...m, access: 'Sin acceso' as const },
)

export function permissionsForRole(role: string): UserPermissionModule[] {
  if (role === 'Admin') return ADMIN_PERMISSIONS
  if (role === 'Manager') {
    return DEFAULT_PERMISSIONS.map((m) =>
      m.id === 'usuarios' || m.id === 'configuracion'
        ? { ...m, access: 'Lectura' as const }
        : { ...m, access: 'Completo' as const },
    )
  }
  if (role === 'Operaciones') return OPERATIONS_PERMISSIONS
  if (role === 'Invitado') return INVITED_PERMISSIONS
  return SALES_PERMISSIONS
}

function sessionsForUser(lastLogin: string): UserSessionEntry[] {
  return [
    { device: 'Chrome · macOS', location: 'Santiago, CL', when: lastLogin },
    { device: 'Safari · iPhone', location: 'Santiago, CL', when: 'Ayer, 18:20' },
    { device: 'Edge · Windows', location: 'Valparaíso, CL', when: '12 may, 16:00' },
  ].filter((s) => s.when !== '—')
}

export function resolveUserListItem(id: string): UserListItem {
  const direct = userListSeed.find((u) => u.id === id)
  let base: UserListItem
  if (direct) {
    base = { ...direct, id }
  } else {
    const pageMatch = /^usuarios-(\d+)$/.exec(id)
    if (pageMatch) {
      const idx = Number.parseInt(pageMatch[1] ?? '0', 10)
      const seed = userListSeed[idx % userListSeed.length]
      base = { ...seed!, id }
    } else {
      base = { ...userListSeed[0]!, id }
    }
  }
  return applyUserListOverride(base, loadUserDetailOverride(id))
}

function mergeDetailOverride(
  built: UserDetail,
  override: UserDetailOverride | null,
): UserDetail {
  if (!override) return built
  return {
    ...built,
    ...override,
    id: built.id,
    profileId: override.profileId ?? built.profileId,
    permissions: built.permissions,
    recentSessions: built.recentSessions,
    notes: built.notes,
  }
}

export function getUserDetail(id: string): UserDetail {
  const base = resolveUserListItem(id)
  const idx = Math.max(0, userListSeed.findIndex((s) => s.id === base.id))
  const override = loadUserDetailOverride(id)
  const extras = detailExtrasForSeed(base, idx === -1 ? 0 : idx)

  const profileId =
    override?.profileId ?? profileIdForUserRole(base.role)

  const built: UserDetail = {
    ...base,
    ...extras,
    profileId,
    permissions: permissionsForRole(base.role),
    recentSessions: sessionsForUser(base.lastLogin),
    notes: mergeEntityNotesForMock('usuario', id, []),
  }

  return mergeDetailOverride(built, override)
}

export function userDetailToOverride(detail: UserDetail): UserDetailOverride {
  return {
    name: detail.name,
    email: detail.email,
    role: detail.role,
    profileId: detail.profileId,
    status: detail.status,
    avatarUrl: detail.avatarUrl,
    phone: detail.phone,
    department: detail.department,
    jobTitle: detail.jobTitle,
    bio: detail.bio,
    timezone: detail.timezone,
    language: detail.language,
    teams: detail.teams,
    twoFactorEnabled: detail.twoFactorEnabled,
  }
}
