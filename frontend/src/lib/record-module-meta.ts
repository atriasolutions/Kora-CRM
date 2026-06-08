export type RecordModuleKey =
  | 'contactos'
  | 'empresas'
  | 'oportunidades'
  | 'cotizaciones'
  | 'actividades'
  | 'proyectos'
  | 'solicitudes'
  | 'compras'
  | 'ingresos'
  | 'inventario'
  | 'productos'
  | 'facturacion'
  | 'usuarios'
  | 'perfiles'

export type RecordUnavailableReason =
  | 'not_found'
  | 'forbidden'
  | 'archived'
  | 'invalid_id'
  | 'connection_error'

type RecordModuleMeta = {
  entityLabel: string
  listPath: string
  listLabel: string
}

export const RECORD_MODULE_META: Record<RecordModuleKey, RecordModuleMeta> = {
  contactos: {
    entityLabel: 'Contacto',
    listPath: '/contactos',
    listLabel: 'Contactos',
  },
  empresas: {
    entityLabel: 'Empresa',
    listPath: '/empresas',
    listLabel: 'Empresas',
  },
  oportunidades: {
    entityLabel: 'Oportunidad',
    listPath: '/oportunidades',
    listLabel: 'Oportunidades',
  },
  cotizaciones: {
    entityLabel: 'Cotización',
    listPath: '/cotizaciones',
    listLabel: 'Cotizaciones',
  },
  actividades: {
    entityLabel: 'Actividad',
    listPath: '/actividades',
    listLabel: 'Actividades',
  },
  proyectos: {
    entityLabel: 'Proyecto',
    listPath: '/proyectos',
    listLabel: 'Proyectos',
  },
  solicitudes: {
    entityLabel: 'Solicitud',
    listPath: '/solicitudes',
    listLabel: 'Solicitudes',
  },
  compras: {
    entityLabel: 'Compra',
    listPath: '/compras',
    listLabel: 'Compras',
  },
  ingresos: {
    entityLabel: 'Ingreso de stock',
    listPath: '/ingresos',
    listLabel: 'Ingresos',
  },
  inventario: {
    entityLabel: 'Registro de inventario',
    listPath: '/inventario',
    listLabel: 'Inventario',
  },
  productos: {
    entityLabel: 'Producto',
    listPath: '/productos',
    listLabel: 'Productos',
  },
  facturacion: {
    entityLabel: 'Factura',
    listPath: '/facturacion',
    listLabel: 'Facturación',
  },
  usuarios: {
    entityLabel: 'Usuario',
    listPath: '/usuarios',
    listLabel: 'Usuarios',
  },
  perfiles: {
    entityLabel: 'Perfil de acceso',
    listPath: '/perfiles',
    listLabel: 'Perfiles',
  },
}

export function recordUnavailableMessage(
  module: RecordModuleKey,
  reason: RecordUnavailableReason,
  options?: { detail?: string },
): { title: string; description: string } {
  const { entityLabel, listLabel } = RECORD_MODULE_META[module]

  if (reason === 'forbidden') {
    return {
      title: 'Sin permiso para ver este registro',
      description:
        options?.detail ??
        `Tu perfil de acceso no incluye permiso de visualización en ${listLabel}. El registro puede existir, pero no está disponible para ti. Si lo necesitas, pide a un administrador que ajuste tu perfil.`,
    }
  }

  if (reason === 'archived') {
    return {
      title: `${entityLabel} no disponible`,
      description:
        'Este registro fue archivado o eliminado de la vista activa. Puede que ya no exista o que debas restaurarlo desde archivados.',
    }
  }

  if (reason === 'invalid_id') {
    return {
      title: 'Enlace no válido',
      description: 'La URL no incluye un identificador de registro válido.',
    }
  }

  if (reason === 'connection_error') {
    return {
      title: 'Error de conexión con el servidor',
      description:
        options?.detail ??
        'No se pudo obtener este registro porque el servidor no está disponible o no responde. Compruebe su conexión e intente nuevamente en unos minutos.',
    }
  }

  return {
    title: `${entityLabel} no disponible`,
    description:
      'El registro al que intentas acceder no existe, fue eliminado o el enlace está desactualizado.',
  }
}
