import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  Contact,
  Factory,
  FileSpreadsheet,
  FolderOpen,
  Headphones,
  Layers,
  LifeBuoy,
  Lock,
  Mail,
  Search,
  Shield,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
  Warehouse,
  Zap,
  Clock,
  AlertTriangle,
  LineChart,
} from 'lucide-react'

import type { MenuModuleId } from '@/lib/menu-modules'

export const MARKETING_HERO_BADGE = 'Para gerentes que necesitan orden y visibilidad'

export const MARKETING_HERO_STATS = [
  { icon: Target, value: '1 flujo', label: 'Del lead al proyecto' },
  { icon: FolderOpen, value: 'Central', label: 'Cotizaciones y documentos' },
  { icon: LineChart, value: 'En vivo', label: 'KPIs para la gerencia' },
  { icon: Users, value: '< 24 h', label: 'Respuesta al solicitar demo' },
] as const

export const MARKETING_PAIN_POINTS = [
  {
    icon: AlertTriangle,
    title: 'Leads que se pierden en el camino',
    description:
      'Consultas en correo, WhatsApp y planillas. Nadie sabe quién hizo seguimiento ni qué oportunidad está lista para cerrar.',
  },
  {
    icon: FolderOpen,
    title: 'Documentos repartidos en mil lugares',
    description:
      'Cotizaciones en PDF sueltos, proyectos en Excel y archivos en carpetas compartidas. Cada área trabaja con una versión distinta.',
  },
  {
    icon: LineChart,
    title: 'Gerencia sin una foto clara del negocio',
    description:
      'Pedir reportes a ventas y operaciones toma días. Las decisiones se toman con datos desactualizados o intuición.',
  },
] as const

/** Cuatro capacidades clave en home — orientadas a resultado, no a catálogo de módulos. */
export const MARKETING_HOME_OUTCOMES = [
  {
    icon: Target,
    title: 'Captación y pipeline comercial',
    description:
      'Registra cada lead, asigna responsables y avanza oportunidades con etapas claras hasta la cotización.',
    highlights: ['Seguimiento por vendedor', 'Probabilidad y montos', 'Actividades y recordatorios'],
  },
  {
    icon: FileSpreadsheet,
    title: 'Documentos comerciales ordenados',
    description:
      'Cotizaciones y facturas vinculadas al cliente, con historial y PDF listo — sin buscar en el correo.',
    highlights: ['PDF profesional', 'Estados de seguimiento', 'Todo en la ficha del cliente'],
  },
  {
    icon: Layers,
    title: 'Proyectos y ejecución conectados',
    description:
      'Cuando ganas la venta, el proyecto nace con el mismo contexto: tareas, compras e inventario en un solo lugar.',
    highlights: ['Plan de trabajo', 'Compras vinculadas', 'Avance visible para gerencia'],
  },
  {
    icon: BarChart3,
    title: 'Visibilidad para tomar decisiones',
    description:
      'Dashboard, reportes y búsqueda global sobre la misma información que usa tu equipo todos los días.',
    highlights: ['Embudo y KPIs', 'Reportes exportables', 'Permisos por rol'],
  },
] as const

export const MARKETING_WHY_KORA = [
  {
    title: 'Un solo lugar para vender y ejecutar',
    description:
      'Contactos, oportunidades, documentos, proyectos e inventario comparten la misma base — sin re-digitación entre áreas.',
  },
  {
    title: 'Control sin depender de IT',
    description:
      'Define qué ve y edita cada perfil por módulo. Ventas, bodega y dirección acceden solo a lo que les corresponde.',
  },
  {
    title: 'Escala con tu empresa',
    description:
      'Desde equipos comerciales en crecimiento hasta operaciones con inventario y reportes para la gerencia.',
  },
] as const

export const MARKETING_TRUST_ITEMS = [
  { icon: Target, label: 'Pipeline y seguimiento de leads en un solo flujo' },
  { icon: FolderOpen, label: 'Cotizaciones y documentos centralizados por cliente' },
  { icon: LineChart, label: 'Reportes y KPIs para gerencia en tiempo real' },
  { icon: Users, label: 'Implementación guiada — respuesta en menos de 24 h hábiles' },
] as const

export const MARKETING_HIGHLIGHT_MODULES = [
  {
    icon: Target,
    title: 'Pipeline comercial',
    description: 'Cada lead y oportunidad con responsable, etapa y próximo paso definido.',
    moduleId: 'oportunidades' as MenuModuleId,
    highlights: ['Etapas personalizables', 'Montos y probabilidad', 'Vínculo con cotizaciones'],
  },
  {
    icon: Contact,
    title: 'Clientes y contactos',
    description: 'Historial comercial completo: interacciones, documentos y actividades en una ficha.',
    moduleId: 'contactos' as MenuModuleId,
    highlights: ['Historial de interacciones', 'Empresas y cuentas', 'Actividades programadas'],
  },
  {
    icon: BarChart3,
    title: 'Visión gerencial',
    description: 'Embudo, KPIs y reportes para decidir sin pedir planillas a cada área.',
    moduleId: 'dashboard' as MenuModuleId,
    highlights: ['Embudo de ventas', 'Actividad del equipo', 'Reportes exportables'],
  },
  {
    icon: FileSpreadsheet,
    title: 'Cotizaciones y facturación',
    description: 'Propuestas y documentos de venta ordenados, trazables y listos para enviar.',
    moduleId: 'cotizaciones' as MenuModuleId,
    highlights: ['PDF profesional', 'Líneas con productos', 'Seguimiento de estado'],
  },
  {
    icon: Layers,
    title: 'Proyectos y operaciones',
    description: 'Ejecuta lo vendido con plan de trabajo, compras e ingresos integrados.',
    moduleId: 'proyectos' as MenuModuleId,
    highlights: ['Tablero de tareas', 'Avance calculado', 'Compras vinculadas'],
  },
  {
    icon: Warehouse,
    title: 'Inventario y productos',
    description: 'Catálogo y stock alineados a lo que cotizas y entregas.',
    moduleId: 'inventario' as MenuModuleId,
    highlights: ['Stock por bodega', 'Ajustes y movimientos', 'Catálogo centralizado'],
  },
] as const

export type MarketingFeatureGroup = {
  id: string
  title: string
  description: string
  items: MarketingFeatureItem[]
}

export type MarketingFeatureItem = {
  moduleId?: MenuModuleId
  title: string
  description: string
  icon: LucideIcon
  highlights?: readonly string[]
}

export const MARKETING_FEATURE_GROUPS: MarketingFeatureGroup[] = [
  {
    id: 'comercial',
    title: 'Comercial',
    description: 'Captación de leads, pipeline, cotizaciones y seguimiento hasta el cierre.',
    items: [
      {
        moduleId: 'dashboard',
        title: 'Dashboard',
        description: 'KPIs, embudo y actividad reciente de un vistazo.',
        icon: BarChart3,
        highlights: ['Embudo de ventas', 'Actividades pendientes', 'Oportunidades recientes'],
      },
      {
        moduleId: 'contactos',
        title: 'Contactos',
        description: 'Personas, roles, historial y vínculos con empresas.',
        icon: Contact,
        highlights: ['Ficha completa', 'Correos y notas', 'Relación con oportunidades'],
      },
      {
        moduleId: 'empresas',
        title: 'Empresas',
        description: 'Cuentas, etapas comerciales y relaciones B2B.',
        icon: Building2,
        highlights: ['Cuentas corporativas', 'Contactos vinculados', 'Ubicación en mapa'],
      },
      {
        moduleId: 'oportunidades',
        title: 'Oportunidades',
        description: 'Pipeline, etapas, montos y probabilidad de cierre.',
        icon: Target,
        highlights: ['Pipeline visual', 'Archivos adjuntos', 'Ruta de éxito comercial'],
      },
      {
        moduleId: 'cotizaciones',
        title: 'Cotizaciones',
        description: 'Propuestas comerciales con PDF y seguimiento.',
        icon: FileSpreadsheet,
        highlights: ['Vista previa PDF', 'Líneas con inventario', 'Estados de seguimiento'],
      },
      {
        moduleId: 'facturacion',
        title: 'Facturación',
        description: 'Documentos de venta vinculados al CRM.',
        icon: FileSpreadsheet,
        highlights: ['Vinculado a cotizaciones', 'Estados de cobro', 'Historial comercial'],
      },
      {
        moduleId: 'actividades',
        title: 'Actividades',
        description: 'Tareas, llamadas, reuniones y recordatorios.',
        icon: Zap,
        highlights: ['Calendario de tareas', 'Vinculadas a registros', 'Seguimiento de equipo'],
      },
      {
        moduleId: 'reportes',
        title: 'Reportes',
        description: 'Análisis y tablas exportables del negocio.',
        icon: BarChart3,
        highlights: ['Tablas dinámicas', 'Filtros avanzados', 'Exportación de datos'],
      },
    ],
  },
  {
    id: 'operaciones',
    title: 'Operaciones',
    description: 'Proyectos, compras e inventario cuando la venta ya está ganada.',
    items: [
      {
        moduleId: 'proyectos',
        title: 'Proyectos',
        description: 'Plan de trabajo, avance calculado y equipo asignado.',
        icon: Layers,
        highlights: ['Tablero Kanban', 'Avance automático', 'Archivos del proyecto'],
      },
      {
        moduleId: 'compras',
        title: 'Compras',
        description: 'Órdenes de compra y flujo con proveedores.',
        icon: ShoppingCart,
        highlights: ['OC con PDF', 'Estados de compra', 'Vínculo con proyectos'],
      },
      {
        moduleId: 'ingresos',
        title: 'Ingresos',
        description: 'Recepción de mercadería y conciliación con compras.',
        icon: Boxes,
        highlights: ['Recepción de stock', 'Conciliación con OC', 'Trazabilidad'],
      },
      {
        moduleId: 'inventario',
        title: 'Inventario',
        description: 'Stock por bodega, ajustes y trazabilidad.',
        icon: Warehouse,
        highlights: ['Stock en tiempo real', 'Ajustes auditables', 'Alertas de nivel'],
      },
      {
        moduleId: 'productos',
        title: 'Productos',
        description: 'Catálogo, precios y categorías.',
        icon: Boxes,
        highlights: ['Catálogo central', 'Precios y categorías', 'Usado en cotizaciones'],
      },
    ],
  },
  {
    id: 'plataforma',
    title: 'Plataforma',
    description: 'Permisos por rol, seguridad y configuración para equipos en crecimiento.',
    items: [
      {
        moduleId: 'usuarios',
        title: 'Usuarios',
        description: 'Invitaciones, roles y gestión del equipo.',
        icon: Users,
        highlights: ['Invitación por correo', 'Perfiles asignables', 'Avatar y datos'],
      },
      {
        moduleId: 'perfiles',
        title: 'Perfiles de acceso',
        description: 'Permisos por módulo: ver, crear, editar y eliminar.',
        icon: Shield,
        highlights: ['Control por módulo', 'Menú personalizado', 'Auditoría de accesos'],
      },
      {
        moduleId: 'configuracion',
        title: 'Configuración',
        description: 'Datos de empresa, logo y preferencias del espacio.',
        icon: Layers,
        highlights: ['Logo de empresa', 'Moneda e impuestos', 'Preferencias globales'],
      },
      {
        title: 'Búsqueda global',
        description: 'Encuentra contactos, empresas y registros al instante.',
        icon: Search,
        highlights: ['Atajo desde cualquier pantalla', 'Resultados agrupados', 'Acceso rápido'],
      },
      {
        title: 'Autenticación 2FA',
        description: 'Google Authenticator y políticas de seguridad.',
        icon: Lock,
        highlights: ['TOTP compatible', 'Política por usuario', 'Recuperación segura'],
      },
      {
        title: 'Notas y archivos',
        description: 'Documentación adjunta en cada ficha del CRM.',
        icon: FileSpreadsheet,
        highlights: ['Adjuntos por registro', 'Notas enriquecidas', 'Historial visible'],
      },
    ],
  },
]

export const MARKETING_CRM_EXPLAIN = {
  title: 'Por qué un CRM integrado marca la diferencia',
  paragraphs: [
    'Cuando la empresa crece, el caos no viene de falta de esfuerzo: viene de información repartida. Leads en el correo, cotizaciones en carpetas, proyectos en planillas y gerencia pidiendo reportes que tardan días en armarse.',
    'Kora CRM concentra captación comercial, documentos, proyectos e inventario en una plataforma. Tu equipo vende y ejecuta con los mismos datos; tú decides con información actualizada, no con intuición.',
  ],
}

export const MARKETING_FLOW_SECTION = {
  eyebrow: 'Cómo funciona',
  title: 'Del primer contacto a la entrega, sin saltos',
  description:
    'Un lead entra al pipeline, se convierte en cotización y — al ganar — sigue como proyecto. Sin copiar datos entre herramientas.',
} as const

export const MARKETING_COMPARE_SECTION = {
  eyebrow: 'Antes y después',
  title: '¿Te suena familiar?',
  description:
    'Muchas empresas en crecimiento parten así. Kora CRM ordena ventas, documentos y proyectos para que gerencia y equipos trabajen alineados.',
} as const

export const MARKETING_PRODUCT_FLOWS = {
  commercial: {
    title: 'Captación y cierre comercial',
    description: 'Cada lead queda registrado y avanza hasta la venta con trazabilidad.',
    steps: ['Lead / contacto', 'Oportunidad', 'Cotización', 'Facturación'],
  },
  operations: {
    title: 'Ejecución y entrega',
    description: 'Lo que vendiste se gestiona en el mismo sistema — sin empezar de cero.',
    steps: ['Proyecto', 'Compra', 'Ingreso', 'Inventario'],
  },
}

export const MARKETING_PRODUCT_PILLARS = [
  {
    title: 'Leads y ventas bajo control',
    description:
      'Pipeline claro, seguimiento por responsable y documentos comerciales vinculados a cada cliente — sin perder oportunidades en el correo.',
    detail: 'Ideal para gerentes comerciales que necesitan visibilidad del embudo y del equipo sin microgestionar cada planilla.',
  },
  {
    title: 'Proyectos y documentos en un solo lugar',
    description:
      'Al cerrar una venta, el proyecto arranca con el contexto completo: tareas, archivos, compras e inventario conectados.',
    detail: 'Para empresas que venden servicios o productos y no pueden permitirse que operaciones trabaje desconectada de ventas.',
  },
  {
    title: 'Gerencia con datos, no con suposiciones',
    description:
      'Dashboard, reportes y permisos por rol para que dirección vea el negocio en tiempo real y cada área acceda solo a lo suyo.',
    detail: 'Incluye perfiles de acceso y autenticación 2FA para equipos en crecimiento o distribuidos.',
  },
] as const

export const MARKETING_COMPARE = {
  without: [
    'Leads repartidos en correo, WhatsApp y Excel',
    'Cotizaciones y archivos sin trazabilidad por cliente',
    'Proyectos en planillas aparte de ventas',
    'Gerencia esperando reportes manuales de cada área',
  ],
  with: [
    'Pipeline con seguimiento y responsables claros',
    'Documentos comerciales centralizados por oportunidad',
    'Proyectos que nacen de la venta ganada — mismo dato',
    'Dashboard y reportes listos para la gerencia',
  ],
} as const

export const MARKETING_USE_CASES = [
  {
    icon: TrendingUp,
    title: 'Gerente comercial',
    subtitle: 'Captación y cierre',
    pain: 'Los vendedores registran leads en lugares distintos. No sabes qué oportunidades están calientes ni quién hizo seguimiento.',
    solution:
      'Pipeline unificado con etapas, montos y actividades. Cotizaciones PDF vinculadas a cada oportunidad. El dashboard muestra embudo y desempeño del equipo.',
    outcomes: ['Menos leads perdidos', 'Cierres más predecibles', 'Visibilidad del equipo comercial'],
  },
  {
    icon: Factory,
    title: 'Gerente de operaciones',
    subtitle: 'Ejecución y entrega',
    pain: 'Ventas promete una cosa y operaciones arranca otra en planillas distintas. Los documentos del proyecto no están donde el equipo los busca.',
    solution:
      'Proyectos con plan de trabajo, compras, ingresos e inventario integrados. Archivos y notas en cada ficha — sin carpetas compartidas caóticas.',
    outcomes: ['Entrega alineada a lo vendido', 'Documentos trazables por proyecto', 'Stock coherente con lo cotizado'],
  },
  {
    icon: Briefcase,
    title: 'Directorio / gerencia general',
    subtitle: 'Visión y control',
    pain: 'Para saber cómo va el negocio dependes de reuniones y consolidados en Excel que llegan tarde.',
    solution:
      'KPIs, reportes y búsqueda global sobre la misma base de datos. Permisos para que cada rol vea solo lo que le corresponde.',
    outcomes: ['Decisiones con datos actuales', 'Menos reuniones de status', 'Control de accesos por perfil'],
  },
] as const

export const MARKETING_TESTIMONIALS = [
  {
    quote:
      'Antes perdíamos leads porque cada vendedor llevaba su propia planilla. Hoy veo el embudo completo y las cotizaciones están donde deben estar.',
    name: 'Carolina M.',
    role: 'Gerente comercial',
    company: 'Empresa de servicios B2B · 25 personas',
  },
  {
    quote:
      'Lo que más valoramos: al ganar una venta, el proyecto ya tiene el contexto. Dejamos de reescribir lo mismo en tres herramientas.',
    name: 'Andrés R.',
    role: 'Gerente de operaciones',
    company: 'Distribución e inventario · en crecimiento',
  },
  {
    quote:
      'Como directora, necesitaba una foto clara del negocio sin pedir reportes cada semana. En días estábamos operando con datos en tiempo real.',
    name: 'Valentina S.',
    role: 'Directora general',
    company: 'Consultora · equipo en expansión',
  },
] as const

export const MARKETING_TRIAL_STEPS = [
  {
    step: '1',
    title: 'Cuéntanos tu situación',
    description: 'Indica tu empresa, equipo y el principal problema que quieres resolver (leads, documentos, proyectos).',
  },
  {
    step: '2',
    title: 'Llamada de diagnóstico',
    description: 'Agendamos 30 minutos para entender tu flujo comercial y operativo — sin pitch genérico.',
  },
  {
    step: '3',
    title: 'Demo con tu contexto',
    description: 'Te mostramos Kora con un escenario parecido al tuyo: pipeline, cotizaciones y proyectos conectados.',
  },
  {
    step: '4',
    title: 'Propuesta clara',
    description: 'Recibes precio según usuarios, módulos y nivel de acompañamiento. Sin letra chica.',
  },
] as const

export const MARKETING_TRIAL_BENEFITS = [
  'Sin tarjeta de crédito para solicitar acceso',
  'Respuesta en menos de 24 horas hábiles',
  'Demo orientada a gerentes — no solo a técnicos',
  'Implementación guiada según tu operación',
] as const

export const MARKETING_SINGLE_PLAN = {
  name: 'Kora CRM',
  tagline: 'Ventas, documentos y proyectos en una plataforma — plan a la medida de tu equipo',
  priceLabel: 'Consultar',
  priceHint: 'Precio según usuarios, módulos y acompañamiento en la implementación',
  includedHighlights: [
    'Captación comercial y pipeline de ventas',
    'Cotizaciones, facturación y documentos',
    'Proyectos, compras e inventario',
    'Dashboard y reportes para gerencia',
    'Usuarios, perfiles de acceso y 2FA',
    'Implementación y soporte incluidos',
    'Acceso web desde cualquier dispositivo',
  ],
}

export const MARKETING_FAQ = [
  {
    q: '¿Kora me ayuda a no perder leads?',
    a: 'Sí. Cada contacto y oportunidad queda en el pipeline con responsable, etapa y actividades de seguimiento. Dejas de depender del correo o WhatsApp como único registro.',
  },
  {
    q: '¿Puedo centralizar cotizaciones y documentos por cliente?',
    a: 'Sí. Las cotizaciones y facturas se vinculan a contactos y oportunidades, con PDF y historial en la ficha. Todo el equipo ve la misma información.',
  },
  {
    q: '¿Cuánto demora ponerlo en marcha?',
    a: 'Depende del tamaño de tu equipo y datos a migrar. Un espacio operativo suele estar listo en pocos días. Te acompañamos en usuarios, perfiles y carga inicial.',
  },
  {
    q: '¿Puedo definir quién ve o edita cada módulo?',
    a: 'Sí. Perfiles de acceso por módulo: ventas, operaciones, bodega o dirección ven solo lo que necesitan — sin depender de IT para cada cambio.',
  },
  {
    q: '¿Incluye proyectos e inventario además de ventas?',
    a: 'Sí. El plan incluye módulos comerciales y operativos: proyectos, compras, ingresos, inventario y productos. Ideal cuando ventas y ejecución deben estar conectadas.',
  },
  {
    q: '¿Hay límite de usuarios?',
    a: 'El plan se adapta a tu equipo. Contáctanos para una propuesta según cantidad de usuarios y nivel de soporte.',
  },
] as const

export const MARKETING_TRIAL_COPY = {
  title: 'Solicita tu demo gratuita',
  subtitle:
    'Cuéntanos tu empresa y el problema que quieres resolver. Te contactamos para una demo orientada a gerencia, no a jerga técnica.',
  successTitle: '¡Solicitud recibida!',
  successMessage:
    'Registramos tu solicitud en nuestro equipo comercial. Te contactaremos en menos de 24 horas hábiles al correo indicado.',
}

export const MARKETING_SUPPORT_EMAIL = 'contacto@atriasolutions.cl'

export const MARKETING_SUPPORT_HERO = {
  title: 'Estamos contigo cuando lo necesites',
  subtitle:
    'Soporte humano, respuesta clara y un equipo que conoce tu operación. Si tienes un problema, una duda o necesitas ayuda con tu cuenta, contáctanos.',
}

export const MARKETING_SUPPORT_CHANNELS = [
  {
    icon: Mail,
    title: 'Correo de soporte',
    description: 'Escríbenos con el detalle de tu consulta. Ideal para incidencias, accesos o seguimiento.',
    action: `mailto:${MARKETING_SUPPORT_EMAIL}`,
    actionLabel: MARKETING_SUPPORT_EMAIL,
  },
  {
    icon: Headphones,
    title: 'Formulario de contacto',
    description: 'Cuéntanos qué ocurre y te respondemos al correo indicado, normalmente en el mismo día hábil.',
    action: '#contacto-soporte',
    actionLabel: 'Ir al formulario',
  },
  {
    icon: LifeBuoy,
    title: 'Ayuda dentro del CRM',
    description: 'Si ya tienes cuenta, usa el icono de ayuda (?) en la barra superior para guías por módulo.',
    action: '/login',
    actionLabel: 'Iniciar sesión',
  },
] as const

export const MARKETING_SUPPORT_COMMITMENTS = [
  {
    icon: Clock,
    title: 'Respuesta ágil',
    description:
      'Consultas de soporte reciben respuesta en menos de 24 horas hábiles. Incidencias críticas tienen prioridad.',
  },
  {
    icon: Users,
    title: 'Acompañamiento real',
    description:
      'No eres un ticket anónimo: te atiende el equipo que implementó y conoce Kora CRM.',
  },
  {
    icon: Shield,
    title: 'Datos protegidos',
    description:
      'Infraestructura cloud, accesos con perfiles granulares y autenticación 2FA disponible para tu equipo.',
  },
  {
    icon: Lock,
    title: 'Confidencialidad',
    description:
      'La información que nos compartes se usa solo para resolver tu consulta y mejorar tu experiencia.',
  },
] as const

export const MARKETING_SUPPORT_TOPICS = [
  {
    title: 'Problemas técnicos',
    description: 'Errores, pantallas que no cargan, comportamiento inesperado o lentitud.',
  },
  {
    title: 'Acceso y cuentas',
    description: 'Invitaciones, restablecer contraseña, activación de cuenta o permisos de usuario.',
  },
  {
    title: 'Uso del CRM',
    description: 'Cómo registrar una oportunidad, generar cotizaciones, proyectos o inventario.',
  },
  {
    title: 'Plan y facturación',
    description: 'Consultas sobre tu contrato, usuarios adicionales o ampliación de módulos.',
  },
] as const

export const MARKETING_SUPPORT_SECURITY = {
  title: 'Tu operación en buenas manos',
  paragraphs: [
    'Kora CRM se ejecuta en infraestructura cloud con buenas prácticas de seguridad: conexiones cifradas, respaldos periódicos y control de accesos por perfil.',
    'Puedes exigir autenticación en dos pasos (2FA) para tu equipo y definir qué ve o edita cada rol en cada módulo del CRM.',
    'Ante cualquier incidente o duda sobre la seguridad de tu cuenta, contáctanos de inmediato. Priorizamos la continuidad de tu operación y la protección de tus datos.',
  ],
} as const

export const MARKETING_SUPPORT_FAQ = [
  {
    q: '¿Cuánto demora la respuesta de soporte?',
    a: 'Normalmente respondemos el mismo día hábil. Si tu consulta es urgente, indícalo en el asunto o mensaje y le daremos prioridad.',
  },
  {
    q: '¿Qué información debo incluir al reportar un problema?',
    a: 'Indica tu empresa, usuario afectado, qué estabas haciendo, qué esperabas y qué ocurrió. Si puedes, adjunta capturas en el correo de seguimiento.',
  },
  {
    q: '¿El soporte está incluido en el plan?',
    a: 'Sí. El plan de Kora CRM incluye soporte para uso de la plataforma, consultas de configuración y resolución de incidencias según tu contrato.',
  },
  {
    q: '¿Cómo recupero el acceso si olvidé mi contraseña?',
    a: 'En la pantalla de inicio de sesión usa «Olvidé mi contraseña» con el correo de tu cuenta. Si no recibes el enlace, escríbenos desde el formulario de soporte.',
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'Operamos en infraestructura cloud con cifrado en tránsito, respaldos y controles de acceso. Puedes activar 2FA y perfiles restrictivos por módulo.',
  },
] as const

export const MARKETING_SUPPORT_TOPICS_FORM = [
  { value: 'technical', label: 'Problema técnico' },
  { value: 'access', label: 'Acceso o cuenta' },
  { value: 'usage', label: 'Uso del CRM' },
  { value: 'billing', label: 'Plan o facturación' },
  { value: 'other', label: 'Otra consulta' },
] as const

export const MARKETING_SUPPORT_COPY = {
  formTitle: 'Cuéntanos qué necesitas',
  formSubtitle:
    'Completa el formulario y te responderemos al correo indicado. Si ya eres cliente, incluye el nombre de tu empresa.',
  successTitle: 'Mensaje enviado',
  successMessage:
    'Recibimos tu consulta. Te contactaremos pronto al correo que indicaste. Si es urgente, también puedes escribir directamente a contacto@atriasolutions.cl.',
}
