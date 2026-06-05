/**
 * Imágenes de la pantalla de bienvenida.
 *
 * Coloca los archivos en `frontend/public/welcome/` para que se sirvan en `/welcome/…`.
 * Si falta un archivo, la UI muestra un marcador con el nombre sugerido.
 */
export type WelcomeAssetSpec = {
  /** Ruta pública servida por Vite (carpeta public/). */
  src: string
  /** Nombre del archivo que debes agregar en public/welcome/. */
  recommendedFile: string
  alt: string
  /** Dimensiones orientativas para diseño o stock. */
  recommendedSize: string
  /** Qué tipo de imagen buscar (Unsplash, ilustración, etc.). */
  suggestion: string
}

export const WELCOME_ASSETS = {
  /** Ilustración principal del hero (lado derecho en escritorio). */
  hero: {
    src: '/welcome/welcome-hero.png',
    recommendedFile: 'welcome-hero.png',
    alt: 'Equipo colaborando en un proyecto',
    recommendedSize: '1400 × 900 px',
    suggestion:
      'Ilustración flat o foto luminosa: equipo reunido, laptops o pizarra; tonos azul/violeta acordes a Kora.',
  },
  /** Panel lateral decorativo (columna derecha inferior). */
  side: {
    src: '/welcome/welcome-side.avif',
    recommendedFile: 'welcome-side.avif',
    alt: 'Personas planificando trabajo en conjunto',
    recommendedSize: '800 × 640 px',
    suggestion:
      'Escena de colaboración cercana: manos sobre mesa, post-its, o videollamada; composición vertical.',
  },
  /** Banda decorativa opcional bajo el hero (ancho completo). */
  banner: {
    src: '/welcome/welcome-banner.jpg',
    recommendedFile: 'welcome-banner.jpg',
    alt: 'Espacio de trabajo moderno y organizado',
    recommendedSize: '1600 × 400 px',
    suggestion:
      'Panorámica suave de oficina, escritorio minimalista o abstracto geométrico; poco texto en la imagen.',
  },
} as const satisfies Record<string, WelcomeAssetSpec>

/** Miniaturas opcionales en tarjetas de acceso rápido (solo se ven si el archivo existe). */
export const WELCOME_MODULE_IMAGES: Partial<
  Record<
    string,
    WelcomeAssetSpec & { src: string; recommendedFile: string }
  >
> = {
  proyectos: {
    src: '/welcome/module-proyectos.webp',
    recommendedFile: 'module-proyectos.webp',
    alt: 'Gestión de proyectos',
    recommendedSize: '640 × 360 px',
    suggestion: 'Kanban, Gantt o equipo revisando un plan de proyecto.',
  },
  actividades: {
    src: '/welcome/module-actividades.webp',
    recommendedFile: 'module-actividades.webp',
    alt: 'Actividades y tareas',
    recommendedSize: '640 × 360 px',
    suggestion: 'Agenda, checklist o calendario con tareas completadas.',
  },
  contactos: {
    src: '/welcome/module-contactos.webp',
    recommendedFile: 'module-contactos.webp',
    alt: 'Relaciones con clientes',
    recommendedSize: '640 × 360 px',
    suggestion: 'Red de contactos, tarjetas de visita o CRM personas.',
  },
}
