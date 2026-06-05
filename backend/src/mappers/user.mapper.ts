import type { UserDetail, UserListItem } from '../types/user.js'
import { imageUrlForDetail, imageUrlForList } from '../utils/entity-image.js'
import { formatActivityLabel, formatDateLabel } from '../utils/format.js'

export type UserRow = {
  id: string
  email: string
  name: string
  role: string | null
  profile_id: string
  profile_name?: string | null
  status: UserListItem['status']
  avatar_url: string | null
  phone: string | null
  department: string | null
  job_title: string | null
  timezone: string | null
  language: string | null
  two_factor_enabled: boolean
  totp_secret_encrypted?: string | null
  totp_verified_at?: Date | null
  bio: string | null
  last_login_at: Date | null
  created_at: Date
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  contactos: 'Contactos',
  empresas: 'Empresas',
  oportunidades: 'Oportunidades',
  cotizaciones: 'Cotizaciones',
  facturacion: 'Facturación',
  actividades: 'Actividades',
  proyectos: 'Proyectos',
  compras: 'Compras',
  ingresos: 'Ingresos',
  inventario: 'Inventario',
  productos: 'Productos',
  reportes: 'Reportes',
  usuarios: 'Usuarios',
  perfiles: 'Perfiles',
  configuracion: 'Configuración',
}

export function mapUserRow(row: UserRow): UserListItem {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role ?? '—',
    profileId: row.profile_id,
    profileName: row.profile_name?.trim() || '—',
    lastLogin: formatActivityLabel(row.last_login_at),
    status: row.status,
    avatarUrl: imageUrlForList(row.avatar_url),
  }
}

export function mapUserDetail(row: UserRow): UserDetail {
  return {
    ...mapUserRow(row),
    avatarUrl: imageUrlForDetail(row.avatar_url),
    profileId: row.profile_id,
    phone: row.phone ?? '',
    department: row.department ?? '',
    jobTitle: row.job_title ?? '',
    timezone: row.timezone ?? 'America/Santiago',
    language: row.language ?? 'es',
    memberSince: formatDateLabel(row.created_at),
    twoFactorEnabled: row.two_factor_enabled,
    twoFactorConfigured: Boolean(
      row.totp_secret_encrypted && row.totp_verified_at,
    ),
    bio: row.bio ?? '',
    recentSessions: [],
  }
}

export { MODULE_LABELS }
