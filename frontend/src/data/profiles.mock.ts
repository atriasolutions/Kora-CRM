import {
  createFullModulePermissions,
  createViewOnlyModulePermissions,
  type MenuModuleId,
} from '@/lib/menu-modules'
import type { AccessProfile, AccessProfileListItem } from '@/types/access-profile'

function salesMenuIds(): MenuModuleId[] {
  return [
    'dashboard',
    'contactos',
    'empresas',
    'oportunidades',
    'cotizaciones',
    'actividades',
    'reportes',
  ]
}

function salesPermissions() {
  const allowed = new Set(salesMenuIds())
  return createFullModulePermissions().map((p) => {
    if (!allowed.has(p.moduleId)) {
      return {
        ...p,
        flags: {
          menu: false,
          view: false,
          create: false,
          edit: false,
          delete: false,
        },
      }
    }
    const fullCrud = [
      'contactos',
      'empresas',
      'oportunidades',
      'cotizaciones',
      'actividades',
    ].includes(p.moduleId)
    return {
      ...p,
      flags: {
        menu: true,
        view: true,
        create: fullCrud,
        edit: fullCrud,
        delete: p.moduleId === 'actividades' ? false : fullCrud,
      },
    }
  })
}

export const profileListSeed: AccessProfileListItem[] = [
  {
    id: 'p-admin',
    name: 'Administrador',
    description: 'Acceso total a todos los módulos y acciones.',
    userCount: 1,
    updatedAt: '18 may 2026',
    isSystem: true,
    systemKey: 'admin',
  },
  {
    id: 'p-ventas',
    name: 'Ventas',
    description: 'CRM comercial: contactos, empresas, oportunidades y cotizaciones.',
    userCount: 4,
    updatedAt: '15 may 2026',
  },
  {
    id: 'p-lectura',
    name: 'Solo lectura',
    description: 'Puede ver módulos asignados sin crear ni modificar registros.',
    userCount: 2,
    updatedAt: '10 may 2026',
  },
  {
    id: 'p-operaciones',
    name: 'Operaciones',
    description: 'Proyectos, compras, ingresos e inventario.',
    userCount: 0,
    updatedAt: '20 may 2026',
  },
  {
    id: 'p-invitado',
    name: 'Invitado',
    description: 'Acceso limitado a proyectos (solo lectura) y solicitudes.',
    userCount: 1,
    updatedAt: '20 may 2026',
    systemKey: 'guest',
  },
]

export const profileDetailSeed: Record<string, AccessProfile> = {
  'p-admin': {
    ...profileListSeed[0]!,
    permissions: createFullModulePermissions(),
  },
  'p-ventas': {
    ...profileListSeed[1]!,
    permissions: salesPermissions(),
  },
  'p-lectura': {
    ...profileListSeed[2]!,
    permissions: createViewOnlyModulePermissions([
      'dashboard',
      'contactos',
      'empresas',
      'oportunidades',
      'reportes',
    ]),
  },
  'p-operaciones': {
    ...profileListSeed[3]!,
    permissions: createFullModulePermissions().map((p) => {
      const ops = new Set<MenuModuleId>([
        'dashboard',
        'proyectos',
        'compras',
        'ingresos',
        'inventario',
        'productos',
        'actividades',
      ])
      if (!ops.has(p.moduleId)) {
        return {
          ...p,
          flags: {
            menu: false,
            view: false,
            create: false,
            edit: false,
            delete: false,
          },
        }
      }
      const full = ['proyectos', 'compras', 'ingresos', 'actividades'].includes(
        p.moduleId,
      )
      return {
        ...p,
        flags: {
          menu: true,
          view: true,
          create: full,
          edit: full,
          delete: p.moduleId === 'actividades' ? false : full,
        },
      }
    }),
  },
  'p-invitado': {
    ...profileListSeed[4]!,
    permissions: createFullModulePermissions().map((p) => {
      if (p.moduleId === 'proyectos') {
        return {
          ...p,
          flags: { menu: true, view: true, create: false, edit: false, delete: false },
        }
      }
      if (p.moduleId === 'solicitudes') {
        return {
          ...p,
          flags: { menu: true, view: true, create: true, edit: true, delete: false },
        }
      }
      if (p.moduleId === 'bitacora') {
        return {
          ...p,
          flags: { menu: true, view: true, create: false, edit: false, delete: false },
        }
      }
      return {
        ...p,
        flags: { menu: false, view: false, create: false, edit: false, delete: false },
      }
    }),
  },
}

export const DEFAULT_PROFILE_ID = 'p-admin'

export function profileIdForUserRole(role: string): string {
  if (role === 'Admin') return 'p-admin'
  if (role === 'Manager') return 'p-ventas'
  if (role === 'Ventas' || role === 'Marketing' || role === 'CS') return 'p-ventas'
  if (role === 'Operaciones') return 'p-operaciones'
  if (role === 'Invitado') return 'p-invitado'
  if (role === 'Soporte') return 'p-lectura'
  return 'p-lectura'
}

export function profileNameForId(profileId: string): string {
  return profileListSeed.find((p) => p.id === profileId)?.name ?? '—'
}
