/** Umbral para mostrar aviso de rendimiento (miles de registros). */
export const LARGE_DATASET_WARN_THRESHOLD = 150

/** Tarjetas visibles por columna Kanban al cargar / ampliar. */
export const KANBAN_COLUMN_INITIAL_LIMIT = 50
export const KANBAN_COLUMN_LOAD_STEP = 50

/** Altura máxima del cuerpo de columna Kanban (scroll interno). */
export const KANBAN_COLUMN_SCROLL_CLASS = 'max-h-[min(70vh,720px)] overflow-y-auto'

/** Filas por página en vista Segmentos. */
export const SEGMENTS_PAGE_SIZE = 50

export function formatLargeCount(n: number): string {
  return n.toLocaleString('es-CL')
}
