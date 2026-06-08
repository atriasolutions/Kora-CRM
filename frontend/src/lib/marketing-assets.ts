/**
 * Catálogo de imágenes del sitio marketing.
 *
 * Archivos en `frontend/public/marketing/screenshots/` → servidos como `/marketing/screenshots/…`
 *
 * ## Pantallazos actuales
 * - home-welcome.png — /inicio (hero)
 * - dashboard.png — KPIs y embudo
 * - contactos.png — captación y relaciones
 * - proyectos-gantt.png — plan de trabajo Gantt
 * - reportes.png — explorador de reportes
 * - usuarios.png — equipo, roles y perfiles
 */
export type MarketingAssetSpec = {
  src: string
  recommendedFile: string
  alt: string
  recommendedSize: string
  suggestion: string
}

export const MARKETING_ASSETS = {
  hero: {
    src: '/marketing/screenshots/home-welcome.png',
    recommendedFile: 'screenshots/home-welcome.png',
    alt: 'Pantalla de inicio de Kora CRM con accesos rápidos, módulos y actividades pendientes',
    recommendedSize: '1600 × 900 px',
    suggestion: 'Captura de /inicio — espacio de trabajo con accesos rápidos.',
  },
  heroMobile: {
    src: '/marketing/screenshots/home-welcome.png',
    recommendedFile: 'screenshots/home-welcome.png',
    alt: 'Kora CRM en pantalla de inicio',
    recommendedSize: '800 × 1000 px',
    suggestion: 'Recorte vertical de la pantalla de inicio para móvil (opcional).',
  },
  ogCover: {
    src: '/marketing/og-cover.jpg',
    recommendedFile: 'og-cover.jpg',
    alt: 'Kora CRM — CRM comercial y operativo',
    recommendedSize: '1200 × 630 px',
    suggestion: 'Logo Kora + tagline sobre fondo gradiente para Open Graph.',
  },
  decorativeGrid: {
    src: '/marketing/decorative-grid.svg',
    recommendedFile: 'decorative-grid.svg',
    alt: '',
    recommendedSize: 'vector',
    suggestion: 'Malla o grid tecnológico sutil (incluido por defecto).',
  },
} as const satisfies Record<string, MarketingAssetSpec>

export const MARKETING_SCREENSHOTS = {
  homeWelcome: {
    src: '/marketing/screenshots/home-welcome.png',
    recommendedFile: 'screenshots/home-welcome.png',
    alt: 'Pantalla de inicio de Kora CRM con accesos rápidos y actividades',
    recommendedSize: '1600 × 869 px',
    suggestion: 'Captura de /inicio — bienvenida y accesos rápidos.',
  },
  dashboard: {
    src: '/marketing/screenshots/dashboard.png',
    recommendedFile: 'screenshots/dashboard.png',
    alt: 'Dashboard con KPIs, embudo de ventas e ingresos vs gastos',
    recommendedSize: '1600 × 869 px',
    suggestion: 'Captura de /dashboard — KPIs y gráficos visibles.',
  },
  contactos: {
    src: '/marketing/screenshots/contactos.png',
    recommendedFile: 'screenshots/contactos.png',
    alt: 'Listado de contactos con seguimiento comercial',
    recommendedSize: '1600 × 871 px',
    suggestion: 'Captura del módulo contactos con listado y filtros.',
  },
  proyectos: {
    src: '/marketing/screenshots/proyectos-gantt.png',
    recommendedFile: 'screenshots/proyectos-gantt.png',
    alt: 'Plan de trabajo Gantt con avance, cronograma y actividades del proyecto',
    recommendedSize: '1600 × 871 px',
    suggestion: 'Captura de proyecto — vista Gantt con grupos y actividades.',
  },
  reportes: {
    src: '/marketing/screenshots/reportes.png',
    recommendedFile: 'screenshots/reportes.png',
    alt: 'Explorador de reportes con columnas, filtros y resultados',
    recommendedSize: '1600 × 869 px',
    suggestion: 'Captura del módulo reportes con informe ejecutado.',
  },
  usuarios: {
    src: '/marketing/screenshots/usuarios.png',
    recommendedFile: 'screenshots/usuarios.png',
    alt: 'Gestión de usuarios, roles, perfiles y accesos al CRM',
    recommendedSize: '1600 × 869 px',
    suggestion: 'Captura del módulo usuarios con invitaciones y estados.',
  },
  oportunidades: {
    src: '/marketing/screenshots/oportunidades.webp',
    recommendedFile: 'screenshots/oportunidades.webp',
    alt: 'Pipeline de oportunidades comerciales',
    recommendedSize: '1600 × 869 px',
    suggestion: 'Listado o vista kanban de oportunidades (pendiente).',
  },
  cotizacion: {
    src: '/marketing/screenshots/cotizacion.webp',
    recommendedFile: 'screenshots/cotizacion.webp',
    alt: 'Detalle de cotización comercial',
    recommendedSize: '1600 × 869 px',
    suggestion: 'Ficha de cotización o vista previa PDF (pendiente).',
  },
  inventario: {
    src: '/marketing/screenshots/inventario.webp',
    recommendedFile: 'screenshots/inventario.webp',
    alt: 'Control de inventario y stock',
    recommendedSize: '1600 × 869 px',
    suggestion: 'Módulo inventario (pendiente).',
  },
  busquedaGlobal: {
    src: '/marketing/screenshots/busqueda-global.webp',
    recommendedFile: 'screenshots/busqueda-global.webp',
    alt: 'Búsqueda global en el CRM',
    recommendedSize: '1600 × 869 px',
    suggestion: 'Barra de búsqueda con resultados (pendiente).',
  },
  mobileHome: {
    src: '/marketing/screenshots/mobile-home.webp',
    recommendedFile: 'screenshots/mobile-home.webp',
    alt: 'Kora CRM en dispositivo móvil',
    recommendedSize: '375 × 812 px',
    suggestion: 'Vista móvil (pendiente).',
  },
  mobileMenu: {
    src: '/marketing/screenshots/mobile-menu.webp',
    recommendedFile: 'screenshots/mobile-menu.webp',
    alt: 'Menú de navegación móvil',
    recommendedSize: '375 × 812 px',
    suggestion: 'Drawer del menú en móvil (pendiente).',
  },
} as const satisfies Record<string, MarketingAssetSpec>

/** Galería principal de la home — historias para gerencia. */
export const MARKETING_HOME_SCREENSHOT_KEYS = [
  'dashboard',
  'contactos',
  'proyectos',
  'reportes',
  'usuarios',
] as const satisfies ReadonlyArray<keyof typeof MARKETING_SCREENSHOTS>

export const MARKETING_SCREENSHOT_CAPTIONS: Record<
  keyof typeof MARKETING_SCREENSHOTS,
  string
> = {
  homeWelcome:
    'Espacio de trabajo con accesos rápidos a módulos, recordatorios y actividades del día.',
  dashboard:
    'KPIs, embudo de ventas e ingresos vs gastos — la foto del negocio para la gerencia.',
  contactos:
    'Cada lead y cliente con historial, empresa y seguimiento comercial en un listado claro.',
  proyectos:
    'Plan de trabajo Gantt con avance, cronograma y responsables — de la venta a la entrega.',
  reportes:
    'Reportes configurables con columnas, filtros y exportación para decidir con datos.',
  usuarios:
    'Invita al equipo, asigna roles y perfiles — control de accesos sin depender de IT.',
  oportunidades: 'Pipeline comercial claro de principio a cierre.',
  cotizacion: 'Cotizaciones profesionales listas para enviar.',
  inventario: 'Stock, productos y trazabilidad operativa.',
  busquedaGlobal: 'Encuentra cualquier registro en segundos.',
  mobileHome: 'Experiencia fluida en móvil y tablet.',
  mobileMenu: 'Navegación optimizada para equipos en movimiento.',
}
