import type { MenuModuleId, PermissionAction } from '@/lib/menu-modules'
import type { HelpContext } from '@/lib/help-context'
import {
  HELP_COMPANY_LIFECYCLE_CONCEPTS,
  HELP_CONTACT_STATUS_CONCEPTS,
  HELP_OPPORTUNITY_STAGE_CONCEPTS,
  HELP_PROJECT_JOURNEY_CONCEPTS,
  HELP_QUOTE_STAGE_CONCEPTS,
  HELP_SOLICITUD_JOURNEY_CONCEPTS,
} from '@/help/help-lifecycle-stages'

export type HelpTopic = {
  /** Título mostrado arriba del panel */
  title: string
  summary: string
  /** Acciones típicas (todas las audiencias) */
  actions: string[]
  /** Acciones que solo aplican si tienes permiso de creación */
  actionsIfCreate?: string[]
  /** Acciones que solo aplican si tienes permiso de edición */
  actionsIfEdit?: string[]
  concepts?: string[]
  permissionsNote: string
  tips?: string[]
  /** Palabras extra para el buscador dentro de «Todas las ayudas» */
  keywords?: string[]
}

/** Frase genérica si faltan bullets condicionales */
export function formatPermissionLine(
  moduleLabel: string,
  canView: boolean,
  canCreate: boolean,
  canEdit: boolean,
  canDelete: boolean,
): string {
  const parts: string[] = []
  if (!canView)
    return `Tu perfil no incluye acceso a ${moduleLabel}. Si lo necesitas, pide a un administrador que ajuste tu perfil de permisos.`
  if (!canCreate && !canEdit && !canDelete) {
    parts.push('Solo lectura: puedes revisar información pero no crear, editar ni eliminar registros.')
    return parts.join(' ')
  }
  if (canCreate) parts.push('Creación')
  if (canEdit) parts.push('edición')
  if (canDelete) parts.push('eliminación')
  return `Según tu perfil tienes: visualización${parts.length ? `, ${parts.join(', ')}` : ''}. Las acciones del menú pueden ocultarse si no aplican.`
}

export type EffectiveHelpTopic = HelpTopic & {
  /** Línea generada con permisos reales */
  yourAccessLine: string | null
}

type ListDetailInput = {
  titleList: string
  summary: string
  actions: string[]
  actionsIfCreate?: string[]
  actionsIfEdit?: string[]
  concepts?: string[]
  permissionsNote?: string
  tips?: string[]
  keywords?: string[]
}

const listDetail = (
  name: string,
  list: ListDetailInput,
  detailExtra: { titleDetail: string } & Partial<Omit<HelpTopic, 'title'>>,
): Record<string, HelpTopic> => {
  const permissionsNote =
    list.permissionsNote ?? 'Las acciones disponibles dependen de tu perfil de permisos.'
  const baseList: HelpTopic = {
    title: list.titleList,
    summary: list.summary,
    actions: list.actions,
    actionsIfCreate: list.actionsIfCreate,
    actionsIfEdit: list.actionsIfEdit,
    concepts: list.concepts,
    permissionsNote,
    tips: list.tips,
    keywords: list.keywords,
  }
  const baseDetail: HelpTopic = {
    title: detailExtra.titleDetail ?? `${name} · ficha`,
    summary: detailExtra.summary ?? list.summary,
    actions: detailExtra.actions ?? [
      'Ver datos completos y el historial relacionado.',
      'Usar las pestañas o secciones para profundizar.',
    ],
    actionsIfCreate: detailExtra.actionsIfCreate,
    actionsIfEdit: detailExtra.actionsIfEdit ?? list.actionsIfEdit,
    concepts: detailExtra.concepts,
    permissionsNote: detailExtra.permissionsNote ?? permissionsNote,
    tips: detailExtra.tips ?? list.tips,
    keywords: [...(list.keywords ?? []), ...(detailExtra.keywords ?? []), 'detalle', 'ficha'],
  }
  return {
    [`${name}.list`]: baseList,
    [`${name}.detail`]: baseDetail,
  }
}

export const HELP_CONTENT: Record<string, HelpTopic> = {
  home: {
    title: 'Inicio',
    summary:
      'Pantalla de bienvenida al entrar a Kora. Muestra un saludo y accesos rápidos a los módulos que tu perfil permite usar.',
    actions: [
      'Usar las tarjetas de acceso rápido para ir a un módulo.',
      'Pulsar el logo superior izquierdo para volver aquí desde cualquier pantalla.',
      'Abrir el Dashboard desde el botón o el menú lateral, si tu perfil lo incluye.',
    ],
    permissionsNote:
      'Esta pantalla está disponible para todos los usuarios. Los módulos listados dependen de tu perfil de acceso.',
    tips: [
      'Los invitados suelen ver solo los módulos que el administrador les asignó, sin métricas del negocio.',
    ],
    keywords: ['bienvenida', 'inicio', 'home'],
  },
  dashboard: {
    title: 'Dashboard',
    summary:
      'Panel resumen con métricas y accesos rápidos. Sirve para tener una vista general del negocio antes de entrar a cada módulo.',
    actions: [
      'Revisar indicadores y tarjetas destacadas.',
      'Ir a módulos desde el menú lateral o desde accesos que aparezcan aquí.',
      'Usar la búsqueda global (arriba) para encontrar contactos, empresas u otros registros.',
    ],
    permissionsNote: 'El contenido del panel depende de tu perfil y de los módulos a los que tengas acceso.',
    tips: [
      'El icono de campana es notificaciones (en expansión). El de ayuda abre esta guía contextual.',
    ],
    keywords: ['inicio', 'resumen', 'métricas'],
  },
  generic: {
    title: 'Ayuda',
    summary:
      'Esta sección aún no tiene una guía específica. Usa el menú lateral para ir al módulo que necesites o abre «Todas las ayudas» para buscar por nombre.',
    actions: [
      'Explorar el CRM desde el menú izquierdo.',
      'Probar la búsqueda superior para localizar registros.',
      'Consultar con tu administrador si accedes desde un enlace y no ves el módulo esperado.',
    ],
    permissionsNote:
      'Tu organización define qué menús y acciones ves mediante perfiles de usuario.',
    keywords: ['general', 'principal'],
  },

  ...listDetail('contactos', {
    titleList: 'Contactos · listado',
    summary:
      'Personas con las que trabajas: decisores, usuarios y otros interesados. Agrúpalos, filtra por estado y vincúlalos a empresas y oportunidades.',
    actions: [
      'Buscar y ordenar la tabla; cambiar vista lista, segmentos u otro modo si está disponible.',
      'Abrir una ficha para ver el detalle completo.',
      'Ver o restaurar archivados desde la vista de papelera si tu rol lo permite.',
    ],
    actionsIfCreate: ['Crear contacto nuevo con datos mínimos y ampliar después.'],
    actionsIfEdit: ['Editar datos del contacto desde su ficha.', 'Archivar o desarchivar según permisos.'],
    concepts: HELP_CONTACT_STATUS_CONCEPTS,
    permissionsNote: 'Creación, edición y eliminación/archivado dependen del perfil asignado.',
    tips: ['Un contacto puede asociarse a una empresa y verse en oportunidades y actividades.'],
    keywords: ['personas', 'leads', 'clientes', 'estado', 'etapa', 'prospecto', 'proveedor'],
  }, {
    titleDetail: 'Contactos · ficha',
    summary:
      'Vista detallada de una persona: comunicación, empresa vinculada, actividades e historial relacionado.',
    actions: [
      'Revisar todas las pestañas (notas, actividades, archivos, según el CRM).',
      'Copiar datos o exportar si la pantalla lo permite.',
    ],
    actionsIfEdit: ['Actualizar datos de contacto.', 'Gestionar vínculos con empresas u oportunidades.'],
    concepts: HELP_CONTACT_STATUS_CONCEPTS,
    keywords: ['detalle contacto', 'estado', 'etapa'],
  }),

  ...listDetail('empresas', {
    titleList: 'Empresas · listado',
    summary:
      'Organizaciones cliente, proveedor u otras. Sirve para tener la casa matriz, etapa comercial y ubicación unificadas.',
    actions: [
      'Filtrar por etapa (Prospecto, Cliente, Proveedor, etc.) o por texto.',
      'Abrir empresa para ver casa matriz y contactos relacionados.',
    ],
    actionsIfCreate: ['Registrar una empresa nueva con RUT/industria.'],
    actionsIfEdit: ['Editar la ficha de la empresa.', 'Archivar cuando la relación ya no esté activa.'],
    concepts: HELP_COMPANY_LIFECYCLE_CONCEPTS,
    permissionsNote: 'Las acciones de alta y baja respetan tu perfil.',
    tips: [
      'Desde la ficha puedes ver cotizaciones u oportunidades asociadas.',
      'Para compras, la empresa debe estar en etapa Proveedor.',
    ],
    keywords: ['compañías', 'organizaciones', 'RUT', 'etapa', 'lead', 'cliente', 'proveedor', 'activa'],
  }, {
    titleDetail: 'Empresas · ficha',
    summary: 'Detalle de la organización: ubicación, equipo, oportunidades y documentos relacionados.',
    actions: ['Explorar datos de casa matriz y sucursales si existen.'],
    actionsIfEdit: ['Actualizar razón social, etapa, estado de cuenta e industria.'],
    concepts: HELP_COMPANY_LIFECYCLE_CONCEPTS,
    keywords: ['detalle empresa', 'etapa', 'proveedor'],
  }),

  ...listDetail('oportunidades', {
    titleList: 'Oportunidades · listado',
    summary:
      'Negocios en curso con valor estimado y etapa del embudo. Agrupa el seguimiento comercial por negocio.',
    actions: [
      'Filtrar por etapa, propietario o importe.',
      'Abrir un negocio para ver líneas, cotizaciones asociadas y actividades.',
      'Cambiar entre vista lista, tablero tipo kanban u otras si están activas.',
    ],
    actionsIfCreate: ['Abrir una nueva oportunidad vinculada a empresa o contacto.'],
    actionsIfEdit: ['Mover etapa del embudo en el camino de éxito.', 'Ajustar montos y probabilidad.'],
    concepts: HELP_OPPORTUNITY_STAGE_CONCEPTS,
    permissionsNote: 'Mover o cerrar oportunidades puede requerir permisos de edición.',
    keywords: ['pipeline', 'embudo', 'ventas', 'negocio', 'etapa', 'calificados', 'cerrada', 'perdida'],
  }, {
    titleDetail: 'Oportunidades · ficha',
    summary: 'Seguimiento fino de un negocio concreto: productos, cotizaciones vinculadas y tareas.',
    actions: [
      'Usar el camino de éxito para ver la etapa actual y los pasos permitidos.',
      'Registrar actividades y próximos pasos.',
    ],
    actionsIfEdit: ['Actualizar etapa y montos.'],
    concepts: HELP_OPPORTUNITY_STAGE_CONCEPTS,
    keywords: ['camino de éxito', 'etapa', 'embudo'],
  }),

  ...listDetail('cotizaciones', {
    titleList: 'Cotizaciones · listado',
    summary:
      'Propuestas económicas enviadas al cliente. Sirve para cotizar productos o servicios antes de facturar.',
    actions: [
      'Ver estados (Borrador, Enviada, Aceptada, etc.).',
      'Generar vista previa PDF o duplicar cuando el flujo lo permita.',
      'Gestionar archivados desde la vista de papelera.',
    ],
    actionsIfCreate: ['Crear cotización eligiendo cliente y líneas.'],
    actionsIfEdit: ['Modificar líneas, descuentos y condiciones comerciales.', 'Cambiar estado del documento.'],
    concepts: HELP_QUOTE_STAGE_CONCEPTS,
    permissionsNote: 'Algunas transiciones de estado pueden estar restringidas.',
    tips: [
      'La empresa emisora y el IVA por defecto salen de Configuración cuando generas PDF.',
      'Consulta la sección Conceptos para reservas de stock y facturación.',
    ],
    keywords: ['presupuesto', 'PDF', 'propuesta', 'etapa', 'estado', 'aceptada', 'borrador'],
  }, {
    titleDetail: 'Cotizaciones · ficha',
    summary: 'Edición de líneas, totales, notas y exportación a PDF de una cotización.',
    actions: [
      'Revisar totales, impuestos y texto legal de la propuesta.',
      'Seguir el camino de éxito para avanzar o pausar la cotización.',
    ],
    actionsIfEdit: ['Añadir o quitar ítems (salvo en Aceptada).', 'Marcar como enviada o aceptada según tu proceso.'],
    concepts: HELP_QUOTE_STAGE_CONCEPTS,
    keywords: ['camino de éxito', 'aceptada', 'reserva', 'factura'],
  }),

  ...listDetail('facturacion', {
    titleList: 'Facturación · listado',
    summary:
      'Documentos de facturación y su estado de cobro. Conecta con el flujo posterior a cotización u orden.',
    actions: ['Filtrar por número, cliente o estado.', 'Abrir documento para ver detalle y etapas.'],
    actionsIfCreate: ['Emitir factura desde el flujo permitido (según integración).'],
    actionsIfEdit: ['Actualizar etapas de cobro o datos administrativos permitidos.'],
    permissionsNote: 'La facturación electrónica real depende de integraciones y permisos.',
    keywords: ['factura', 'cobro', 'DTE'],
  }, {
    titleDetail: 'Facturación · ficha',
    summary: 'Detalle de la factura: importes, historial de etapas y documentos asociados.',
    actions: ['Seguir el camino de éxito o etapas indicadas en pantalla.'],
    actionsIfEdit: ['Registrar avances de cobro si el módulo lo habilita.'],
  }),

  ...listDetail('actividades', {
    titleList: 'Actividades · listado',
    summary:
      'Tareas, llamadas, reuniones y seguimientos. Centraliza qué hay que hacer y con quién.',
    actions: [
      'Filtrar por responsable, fecha o tipo.',
      'Marcar como hecha o posponer según permisos.',
    ],
    actionsIfCreate: ['Programar una nueva actividad vinculada a contacto u oportunidad.'],
    actionsIfEdit: ['Reasignar o editar fecha y descripción.'],
    permissionsNote: 'Ver actividades de otros puede estar limitado por perfil.',
    keywords: ['tareas', 'calendario', 'llamadas'],
  }, {
    titleDetail: 'Actividades · ficha',
    summary: 'Una sola actividad con contexto completo del registro relacionado.',
    actions: ['Marcar resultado y crear seguimiento.'],
    actionsIfEdit: ['Modificar fecha límite o responsable.'],
  }),

  ...listDetail('proyectos', {
    titleList: 'Proyectos · listado',
    summary:
      'Iniciativas de implementación, obra o servicio: equipo, fechas, plan de trabajo y vínculo con oportunidad o cotización aceptada.',
    actions: [
      'Filtrar y buscar proyectos por nombre, cliente o estado.',
      'Usar «Mis proyectos» para ver solo los proyectos donde figuras como gerente o miembro en la pestaña Equipo de la ficha.',
      'Los perfiles Administrador pueden usar «Todos los proyectos» para ver el listado completo.',
      'Abrir la ficha para ver plan de trabajo, actividades y documentos.',
      'Revisar archivados desde la vista de papelera si tu perfil lo permite.',
    ],
    actionsIfCreate: ['Crear proyecto con nombre, cliente, gerente y fechas objetivo.'],
    actionsIfEdit: ['Actualizar datos desde el listado o la ficha.', 'Archivar proyectos cerrados.'],
    keywords: ['implementación', 'hitos', 'plan de trabajo', 'obra'],
  }, {
    titleDetail: 'Proyectos · ficha',
    summary:
      'Centro de operación del proyecto: camino de éxito, encabezado con KPIs, pestañas de detalle, plan de trabajo (tabla, Gantt y horas), actividades, notas y archivos.',
    actions: [
      'Revisar el encabezado: cliente, gerente, salud, prioridad, presupuesto, fechas, horas y barra de avance (calculada desde el plan de trabajo cuando existe).',
      'Usar el camino de éxito para ver la etapa actual y el historial de cambios.',
      'Pestaña Detalle: leer la descripción y gestionar el plan de trabajo (grupos, actividades, responsables, fechas y estados de cada ítem).',
      'Cambiar la vista del plan entre Tabla, Gantt y Horas por persona.',
      'Pestaña Información: vínculos CRM (empresa, oportunidad, cotización aceptada), fechas y presupuesto.',
      'Pestaña Equipo: ver y gestionar quién tiene acceso al proyecto (gerente y miembros). Solo esas personas ven el proyecto en «Mis proyectos»; debajo puedes ver el resumen de horas del plan de trabajo.',
      'Pestaña Actividad: listar seguimientos registrados en el proyecto y abrir el detalle de cada uno.',
      'Pestaña Notas: consultar notas internas del equipo.',
      'Pestaña Archivos: descargar documentos adjuntos al proyecto.',
      'Registrar actividad (llamada, reunión, etc.) desde el botón del encabezado; queda vinculada al proyecto.',
      'Ir a la ficha de empresa, oportunidad o cotización desde los enlaces del encabezado o de Información.',
    ],
    actionsIfEdit: [
      'Editar nombre, descripción, cliente, gerente, estado, salud, prioridad, fechas y presupuesto.',
      'Vincular o cambiar oportunidad y cotización de referencia (cotización aceptada).',
      'Avanzar o pausar el proyecto en el camino de éxito (incluye detenciones por cliente o internas).',
      'Pestaña Equipo: agregar usuarios del CRM al equipo o quitar miembros (el gerente no se puede quitar desde aquí).',
      'Plan de trabajo: crear grupos (fases/entregables), añadir actividades y subactividades, asignar responsables, estimar horas, fechas y estado; reordenar con arrastrar y soltar.',
      'Subir, renombrar o eliminar archivos en la pestaña Archivos.',
      'Añadir y eliminar notas en la pestaña Notas.',
      'Archivar el proyecto (papelera temporal; restaurar o eliminación definitiva según política del módulo).',
    ],
    concepts: [
      ...HELP_PROJECT_JOURNEY_CONCEPTS,
      'Plan de trabajo — estados de cada actividad: No iniciado, Planificado, En proceso, Detenido, Completado, Cancelado. El avance % del encabezado pondera los ítems completados.',
      'Asignar un responsable en el plan puede generar notificación al usuario (si está configurado en el sistema).',
      'Equipo del proyecto — en la pestaña Equipo defines quién ve el proyecto en «Mis proyectos» (además del gerente), sin asignarlos a todas las actividades. Quien sea responsable en el plan se agrega al equipo automáticamente.',
    ],
    permissionsNote:
      'Editar el plan, archivos y el camino de éxito requiere permiso de edición en Proyectos. Archivar suele requerir eliminación/archivo según perfil.',
    tips: [
      'Sin plan de trabajo cargado, la pestaña Equipo indica que debes definir actividades en Detalle.',
      'Expande grupos y filas padre en la tabla para ver subactividades; en Gantt visualizas el cronograma.',
      'Las actividades del módulo Actividades y las del plan de trabajo son complementarias: el plan organiza la ejecución; Actividad registra interacciones y tareas de seguimiento.',
    ],
    keywords: [
      'detalle proyecto',
      'camino de éxito',
      'plan de trabajo',
      'gantt',
      'responsable',
      'archivos',
      'notas',
      'cotización',
      'oportunidad',
    ],
  }),

  ...listDetail('solicitudes', {
    titleList: 'Solicitudes · listado',
    summary:
      'Peticiones internas o de clientes: título, descripción, responsable, prioridad y etapa en la ruta del éxito. Centraliza el seguimiento operativo con equipo, notas, archivos y actividades.',
    actions: [
      'Buscar por título, código o responsable.',
      'Cambiar entre vista Lista, Kanban, Segmentos y Archivados.',
      'Usar «Mis solicitudes» para ver solo las que te asignan como responsable o miembro del equipo.',
      'Los perfiles Administrador pueden usar «Todas las solicitudes» para ver el listado completo.',
      'Abrir una ficha para ver la ruta del éxito, descripción enriquecida y pestañas de equipo, notas, archivos y actividad.',
      'Revisar archivados desde la vista de papelera si tu perfil lo permite.',
    ],
    actionsIfCreate: ['Crear solicitud con título, descripción, prioridad y responsable.'],
    actionsIfEdit: [
      'Editar datos desde el listado o la ficha.',
      'Archivar solicitudes cerradas o que ya no requieran seguimiento.',
    ],
    concepts: HELP_SOLICITUD_JOURNEY_CONCEPTS,
    permissionsNote: 'Ver «Todas las solicitudes» suele estar reservado a perfiles de sistema (Administrador).',
    tips: [
      'El responsable predeterminado al crear se configura en Configuración → Solicitudes.',
      'En Kanban las columnas son Activos, Detenidos y Cierre según la etapa de la ruta del éxito.',
    ],
    keywords: [
      'ticket',
      'requerimiento',
      'prioridad',
      'responsable',
      'equipo',
      'etapa',
      'estado',
      'kanban',
      'segmentos',
    ],
  }, {
    titleDetail: 'Solicitudes · ficha',
    summary:
      'Centro de operación de una solicitud: ruta del éxito, descripción con imágenes, equipo con acceso, notas internas, archivos adjuntos y actividades vinculadas.',
    actions: [
      'Revisar el encabezado: código, responsable, estado y prioridad.',
      'Usar la ruta del éxito para ver la etapa actual, el historial y las transiciones permitidas.',
      'Pestaña Detalle: leer la descripción (clic en miniaturas para ampliar imágenes).',
      'Pestaña Equipo: ver quién tiene acceso además del responsable.',
      'Pestaña Notas: consultar notas internas del equipo.',
      'Pestaña Archivos: descargar o revisar documentos adjuntos.',
      'Pestaña Actividad: listar seguimientos (llamadas, reuniones, tareas) vinculados a esta solicitud.',
      'Registrar actividad desde el botón del encabezado; queda vinculada a la solicitud.',
    ],
    actionsIfEdit: [
      'Editar título, descripción, prioridad y responsable.',
      'Avanzar, retroceder o pausar la solicitud en la ruta del éxito (incluye estados fuera de ruta).',
      'Pestaña Equipo: agregar o quitar miembros; al invitar a alguien nuevo puede recibir notificación.',
      'Pestaña Notas: añadir y eliminar notas.',
      'Pestaña Archivos: subir, renombrar o eliminar archivos.',
      'Archivar la solicitud (papelera temporal; restaurar o eliminación definitiva según política del módulo).',
    ],
    concepts: [
      ...HELP_SOLICITUD_JOURNEY_CONCEPTS,
      'Equipo de la solicitud — en la pestaña Equipo defines quién ve la solicitud en «Mis solicitudes» además del responsable.',
      'Descripción enriquecida — las imágenes insertadas en el editor se guardan también en Archivos; al reabrir la ficha se muestran en la descripción.',
      'Actividades — puedes vincular actividades del módulo Actividades a esta solicitud al crearlas o editarlas.',
    ],
    permissionsNote:
      'Editar la ruta del éxito, archivos y equipo requiere permiso de edición en Solicitudes. Archivar suele requerir eliminación/archivo según perfil.',
    tips: [
      'Si no ves el botón de editar etapas, tu perfil puede ser solo lectura en este módulo.',
      'Usa Segmentos en el listado para filtrar urgentes, nuevas, detenidas o sin responsable.',
    ],
    keywords: [
      'detalle solicitud',
      'ruta del éxito',
      'camino de éxito',
      'equipo',
      'archivos',
      'notas',
      'actividad',
      'descripción',
      'imágenes',
    ],
  }),

  ...listDetail('bitacora', {
    titleList: 'Bitácora · listado',
    summary:
      'Registro de horas de trabajo vinculadas a solicitudes: quién trabajó, cuántas horas, si son facturables y en qué fecha. Sirve para control interno y para armar reportes al cliente.',
    actions: [
      'Alternar entre vista Lista (tabla paginada) y Dashboard (resumen de horas para presentar).',
      'Buscar por código de solicitud, título, descripción, responsable o empresa.',
      'Filtrar por fecha de trabajo (todo, mes, año o rango), empresa y facturación.',
      'Usar «Mis bitácoras» para ver solo registros donde figuras como usuario asignado.',
      'Los perfiles con alcance amplio pueden usar «Todas las bitácoras» para ver el listado completo.',
      'Abrir un registro para ver el detalle completo.',
    ],
    actionsIfCreate: [
      'Registrar horas con «Nueva bitácora»: solicitud, fecha, horas, usuario asignado y descripción.',
    ],
    actionsIfEdit: [
      'Modificar un registro desde su ficha.',
      'Eliminar un registro si tu perfil lo permite.',
    ],
    concepts: [
      'Cada registro pertenece a una solicitud; la empresa asociada se toma de esa solicitud.',
      'Horas en incrementos de 0,5 (mínimo 0,5 h).',
      'Facturable — horas cobrables al cliente; si marcas «No facturable», debes indicar el motivo.',
      'Usuario asignado — persona a quien se imputan las horas (puede ser distinta de quien crea el registro).',
      'Invitados — solo ven menú y lectura; el listado y dashboard quedan limitados a la empresa configurada en su usuario.',
    ],
    permissionsNote:
      'Crear, editar o eliminar depende de tu perfil. Los invitados suelen tener solo visualización.',
    tips: [
      'En el dashboard, el filtro de empresa queda fijado a tu empresa asignada si eres invitado.',
      'Al elegir un rango de fechas, «Desde» no puede quedar después de «Hasta»; el sistema ajusta el rango automáticamente.',
      'Desde la pestaña Bitácora de una solicitud puedes ver sus registros y crear uno nuevo con la solicitud ya precargada.',
    ],
    keywords: [
      'horas',
      'timesheet',
      'solicitud',
      'facturable',
      'no facturable',
      'trabajo',
      'registro',
      'dashboard',
      'empresa',
      'invitado',
    ],
  }, {
    titleDetail: 'Bitácora · ficha',
    summary:
      'Detalle de un registro de horas: solicitud vinculada, fecha, duración, facturación, descripción del trabajo y auditoría.',
    actions: [
      'Revisar código y título de la solicitud, empresa, usuario asignado y fecha de trabajo.',
      'Leer la descripción del trabajo realizado.',
      'Consultar si las horas son facturables o no, y el motivo cuando aplica.',
      'Volver al listado con el enlace «Bitácora» en la miga de pan.',
    ],
    actionsIfEdit: [
      'Editar fecha, horas, descripción, facturabilidad y usuario asignado.',
      'Eliminar el registro si ya no aplica (acción irreversible).',
    ],
    concepts: [
      'La solicitud no se puede cambiar libremente en todos los flujos: al crear desde una solicitud, el vínculo queda definido.',
      'Las horas no facturables exigen un motivo breve para justificar el tiempo registrado.',
    ],
    permissionsNote:
      'Si no ves editar ni eliminar, tu perfil es de solo lectura en Bitácora (común en usuarios Invitado).',
    tips: [
      'Usa descripciones claras: facilitan filtrar en el listado y explicar el trabajo al cliente en el dashboard.',
    ],
    keywords: [
      'detalle bitácora',
      'horas',
      'facturable',
      'solicitud',
      'descripción',
      'usuario asignado',
    ],
  }),

  ...listDetail('compras', {
    titleList: 'Compras · listado',
    summary:
      'Órdenes de compra a proveedores y su seguimiento hasta recepción o cierre.',
    actions: ['Filtrar por proveedor o estado.', 'Abrir OC para ver líneas y totales.'],
    actionsIfCreate: ['Generar orden de compra nueva.'],
    actionsIfEdit: ['Ajustar líneas o estado según el flujo aprobado.'],
    keywords: ['OC', 'proveedor', 'orden'],
  }, {
    titleDetail: 'Compras · ficha',
    summary: 'Detalle de la orden: proveedor, cantidades, PDF y relación con ingresos de stock.',
    actions: ['Revisar totales e IVA según configuración de empresa.'],
    actionsIfEdit: ['Actualizar estado de la compra.'],
  }),

  ...listDetail('ingresos', {
    titleList: 'Ingresos (stock) · listado',
    summary:
      'Recepciones de mercadería respecto a compras. Conecta lo comprado con el inventario.',
    actions: ['Ver ingresos por OC o fecha.', 'Abrir un ingreso para ver líneas recibidas.'],
    actionsIfCreate: ['Registrar ingreso de mercadería.'],
    actionsIfEdit: ['Corregir cantidades mientras el documento lo permita.'],
    keywords: ['recepción', 'bodega', 'entrada'],
  }, {
    titleDetail: 'Ingresos · ficha',
    summary: 'Detalle de un ingreso: qué productos entraron y en qué documento de compra se basan.',
    actionsIfEdit: ['Ajustar líneas si el flujo no está cerrado.'],
  }),

  ...listDetail('inventario', {
    titleList: 'Inventario · listado',
    summary:
      'Existencias por SKU o producto. Muestra unidades en bodega (disponible), reservadas por cotizaciones aceptadas y movimientos.',
    actions: [
      'Buscar por código o nombre.',
      'Ver disponible, reservado y estado (En stock, Stock bajo, Quiebre de stock).',
      'Abrir la ficha para ajustar stock o revisar movimientos.',
    ],
    actionsIfEdit: ['Ajustar stock manualmente (entrada o salida en bodega).'],
    concepts: [
      'En bodega: unidades físicas actuales en la ubicación.',
      'Disponible: igual al stock en bodega; las reservas no lo reducen.',
      'Reservado: comprometido por cotizaciones en estado Aceptada; se descuenta al emitir la factura.',
      'Stock mínimo: umbral para alertas de Stock bajo.',
      'Quiebre de stock: las reservas superan lo que hay físicamente en bodega.',
    ],
    tips: [
      'La vista de lista consolida por SKU; en la ficha usa la pestaña Bodegas para el detalle por ubicación.',
      'Los ajustes manuales registran un movimiento tipo Ajuste en el historial.',
    ],
    permissionsNote: 'Los ajustes suelen ser acción sensible; muchos perfiles solo consultan.',
    keywords: [
      'stock',
      'existencias',
      'SKU',
      'reservado',
      'disponible',
      'ajuste',
      'cotización',
      'factura',
    ],
  }, {
    titleDetail: 'Inventario · ficha',
    summary:
      'Posición o producto en inventario: cantidades por bodega, estado operativo, movimientos y vínculo con el catálogo.',
    actions: [
      'Revisar En bodega, Disponible y Reservado en el panel de estado.',
      'Consultar movimientos (reservas, ajustes, salidas por factura, ingresos).',
    ],
    actionsIfEdit: ['Aplicar ajuste o traslado entre bodegas (si está habilitado).'],
    concepts: [
      'Reglas de stock en Kora:',
      '• Cotización → Aceptada: aumenta el Reservado; no baja el Disponible. Puede aceptarse aunque no haya stock suficiente (quedará Quiebre de stock si las reservas superan lo en bodega).',
      '• Cotización aceptada: las líneas de la cotización ya no se pueden editar (hay reservas activas).',
      '• Factura → Emitida: descuenta En bodega (Disponible) y libera el Reservado de la cotización vinculada.',
      '• Factura → Pagada: confirma el cobro; no vuelve a descontar stock si ya se emitió correctamente.',
      '• Ajuste manual: corrige En bodega (+ ingreso, − salida); el Disponible sigue al En bodega.',
      '• Ingreso de mercadería (módulo Ingresos): suma En bodega según recepción de compra.',
      '• Liberar cotización (estado distinto de Aceptada): libera el Reservado sin haber facturado.',
    ],
    tips: [
      'Recibirás notificaciones si el estado pasa a Stock bajo, Quiebre de stock o Sin stock (responsable del producto y quien ejecutó el cambio).',
    ],
    keywords: ['movimientos', 'reserva', 'factura', 'ajuste', 'bodega'],
  }),

  ...listDetail('productos', {
    titleList: 'Productos · listado',
    summary:
      'Catálogo de bienes o servicios vendibles: precios, unidades y datos para cotizar y facturar.',
    actions: [
      'Buscar producto por nombre o SKU.',
      'Cambiar vista segmentos o tabs si la pantalla lo ofrece.',
    ],
    actionsIfCreate: ['Alta de producto con precio y unidad de medida.'],
    actionsIfEdit: ['Actualizar precio, descripción o estado del ítem.', 'Archivar productos discontinuados.'],
    keywords: ['catálogo', 'SKU', 'precio'],
  }, {
    titleDetail: 'Productos · ficha',
    summary: 'Ficha del artículo: datos comerciales, stock relacionado y uso en cotizaciones.',
    actionsIfEdit: ['Editar ficha técnica y comercial.'],
  }),

  ...listDetail('reportes', {
    titleList: 'Reportes',
    summary:
      'Reportes configurables organizados en carpetas. Creas vistas tipo tabla con fuente de datos, columnas ordenables y filtros.',
    actions: [
      'Navegar el árbol de carpetas y reportes.',
      'Ejecutar un reporte para ver la tabla en pantalla.',
      'Exportar cuando exista opción Excel u otro formato.',
    ],
    actionsIfCreate: ['Nueva carpeta o nuevo reporte (tabla dinámica).'],
    actionsIfEdit: ['Editar nombre, filtros y columnas del informe.', 'Eliminar reporte vacío si tu rol lo permite.'],
    tips: [
      'Columnas compactas con «Todas» / «Quitar todas». El orden se arrastra con el ícono de asa.',
      'Eliminar reporte también borra el historial de ejecuciones en base de datos.',
    ],
    keywords: ['informe', 'exportar', 'Excel', 'filtros'],
  }, {
    titleDetail: 'Reportes · detalle',
    summary:
      'Al seleccionar un reporte en el árbol verás su configuración o resultado de ejecución según el panel activo.',
    actions: [
      'Editar columnas, filtros y fuente de datos del informe.',
      'Ejecutar para refrescar la tabla.',
      'Exportar a Excel si está disponible.',
    ],
    actionsIfEdit: ['Renombrar o mover el reporte entre carpetas si tu rol lo permite.'],
  }),

  'usuarios.list': {
    title: 'Usuarios · listado',
    summary:
      'Personas que acceden al CRM: invitaciones, estado y perfil asignado. Gestión habitual de administradores.',
    actions: [
      'Buscar usuario por nombre o correo.',
      'Abrir ficha para revisar datos y perfil.',
    ],
    actionsIfCreate: ['Invitar usuario al sistema.'],
    actionsIfEdit: ['Cambiar perfil asignado o estado (activo/inactivo).'],
    permissionsNote: 'Solo perfiles autorizados deben crear o alterar usuarios.',
    keywords: ['acceso', 'invitar', 'correo'],
  },
  'usuarios.detail': {
    title: 'Usuarios · ficha',
    summary: 'Detalle del usuario corporativo y permisos efectivos mediante su perfil.',
    actions: ['Revisar datos personales y pestaña de permisos asignados.'],
    actionsIfEdit: ['Actualizar datos y pestaña de permisos según alcance del rol.'],
    permissionsNote: 'No confundir con «Perfiles»: aquí están las personas que inician sesión.',
    keywords: ['cuenta'],
  },

  ...listDetail('perfiles', {
    titleList: 'Perfiles · listado',
    summary:
      'Plantillas de permisos por módulo (menú, ver, crear, editar, eliminar). Cada usuario recibe un perfil.',
    actions: ['Comparar perfiles antes de editar.', 'Abrir uno para revisar todas las banderas.'],
    actionsIfCreate: ['Crear perfil para un rol nuevo (ej. solo ventas).'],
    actionsIfEdit: ['Ajustar qué menús ve cada rol.', 'Marcar permisos de creación/edición/eliminación por entidad.'],
    permissionsNote: 'Cambiar perfiles impacta a todos los usuarios asignados.',
    keywords: ['roles', 'permiso', 'acceso'],
  }, {
    titleDetail: 'Perfiles · ficha',
    summary: 'Edición granular del perfil seleccionado con matriz por módulo.',
    actions: ['Guardar solo cuando estés seguro; valida contra usuarios piloto si es posible.'],
    actionsIfEdit: ['Marcar/desmarcar acciones permitidas.', 'Eliminar perfil huérfano solo si nadie lo usa.'],
  }),

  configuracion: {
    title: 'Configuración',
    summary:
      'Ajustes generales del espacio de trabajo y datos del emisor (empresa que aparece en cotizaciones y ordenes de compra).',
    actions: [
      'Definir logo, datos de empresa emisora, región/comuna si aplica.',
      'Otros ítems de catálogo o preferencias disponibles en pestañas.',
    ],
    actionsIfEdit: ['Guardar cambios del emisor antes de imprimir cotizaciones.'],
    permissionsNote: 'Quienes no administren el tenant pueden tener esta vista oculta o en solo lectura.',
    keywords: ['empresa', 'logo', 'IVA'],
  },
}

const MODULE_LABEL: Record<string, string> = {
  dashboard: 'Dashboard',
  contactos: 'Contactos',
  empresas: 'Empresas',
  oportunidades: 'Oportunidades',
  cotizaciones: 'Cotizaciones',
  facturacion: 'Facturación',
  actividades: 'Actividades',
  proyectos: 'Proyectos',
  solicitudes: 'Solicitudes',
  bitacora: 'Bitácora',
  compras: 'Compras',
  ingresos: 'Ingresos',
  inventario: 'Inventario',
  productos: 'Productos',
  reportes: 'Reportes',
  usuarios: 'Usuarios',
  perfiles: 'Perfiles',
  configuracion: 'Configuración',
}

export function moduleIdFromHelpKey(key: string): MenuModuleId | null {
  const mod = key.split('.')[0] ?? ''
  if (mod in MODULE_LABEL) return mod as MenuModuleId
  return null
}

export function lookupHelpTopic(ctx: HelpContext): HelpTopic {
  const direct = HELP_CONTENT[ctx.contentKey]
  if (direct) return direct

  if (ctx.moduleId) {
    const detailKey = `${ctx.moduleId}.detail`
    const listKey = `${ctx.moduleId}.list`
    if (ctx.view === 'detail' && HELP_CONTENT[detailKey]) return HELP_CONTENT[detailKey]
    if (HELP_CONTENT[listKey]) return HELP_CONTENT[listKey]
    if (HELP_CONTENT[ctx.moduleId]) return HELP_CONTENT[ctx.moduleId]
  }

  return HELP_CONTENT.generic
}

export function buildEffectiveTopic(
  base: HelpTopic,
  ctx: HelpContext,
  can: (moduleId: MenuModuleId, action: PermissionAction) => boolean,
  moduleIdOverride?: MenuModuleId | null,
): EffectiveHelpTopic {
  const moduleId = moduleIdOverride ?? ctx.moduleId
  let yourAccessLine: string | null = null
  if (moduleId) {
    const label = MODULE_LABEL[moduleId] ?? moduleId
    yourAccessLine = formatPermissionLine(
      label,
      can(moduleId, 'view'),
      can(moduleId, 'create'),
      can(moduleId, 'edit'),
      can(moduleId, 'delete'),
    )
  }

  const actions = [...base.actions]
  if (moduleId) {
    if (base.actionsIfCreate?.length && can(moduleId, 'create'))
      actions.push(...base.actionsIfCreate.map((t) => `· ${t}`))
    else if (base.actionsIfCreate?.length && !can(moduleId, 'create'))
      actions.push(
        '(Crear nuevo: solicita permiso de creación en este módulo si no ves el botón correspondiente.)',
      )

    if (base.actionsIfEdit?.length && can(moduleId, 'edit'))
      actions.push(...base.actionsIfEdit.map((t) => `· ${t}`))
  }

  return {
    ...base,
    actions,
    yourAccessLine,
  }
}

/** Entradas planas para el índice y el buscador */
export function allHelpTopicsForIndex(): Array<{
  key: string
  topic: HelpTopic
  moduleLabel: string
}> {
  const entries = Object.entries(HELP_CONTENT)
  return entries.map(([key, topic]) => ({
    key,
    topic,
    moduleLabel: MODULE_LABEL[key.split('.')[0] ?? key] ?? key,
  }))
}

export function filterHelpTopics(
  query: string,
  topics: Array<{ key: string; topic: HelpTopic; moduleLabel: string }>,
): typeof topics {
  const q = query.trim().toLowerCase()
  if (!q) return topics
  return topics.filter(({ key, topic, moduleLabel }) => {
    const blob = [
      key,
      moduleLabel,
      topic.title,
      topic.summary,
      ...(topic.keywords ?? []),
      ...topic.actions,
      ...(topic.concepts ?? []),
      ...(topic.tips ?? []),
    ]
      .join(' ')
      .toLowerCase()
    return blob.includes(q)
  })
}
